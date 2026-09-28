import { useCallback, useEffect, useRef, useState } from 'react';
import { createReport, reverseGeocode, searchLocations, uploadReportPhoto, type ReportCreate } from '../../api';
import { saveReport } from '../../lib/savedReports';
import { DEMO_LAT, DEMO_LON, EMAIL_RE, MAX_ADDRESS_CHARS, MAX_DESCRIPTION_CHARS, MAX_PHOTOS, MAX_SUBCATEGORY_CHARS, OTHER_CATEGORY, limitWords, type Step } from './data';
import { useTurnstileToken } from './useTurnstileToken';

export interface Photo {
  id: number;
  /** Object URL for the preview (revoked when the photo is removed or the form is reset). */
  url: string;
  name: string;
  file: File;
}

/** A point picked on the map: coordinates + where it sits in the map box, in %. */
export interface MapSelection {
  lat: number;
  lon: number;
  x: number;
  y: number;
}

export type LocMode = 'pin' | 'gps' | 'search' | null;

export interface ReportFormState {
  step: Step;
  category: string | null;
  /** For OTHER_CATEGORY: the free text the citizen typed. */
  subcategory: string | null;
  categoryError: string;
  title: string;
  titleError: string;
  desc: string;
  photos: Photo[];
  locMode: LocMode;
  /** Pin position in the map box (percent strings with 1 decimal, as the static page). */
  pinPos: { x: string; y: string } | null;
  /** Coordinates sent to the backend. null = not known yet (search still resolving). */
  coords: { lat: number; lon: number } | null;
  geoError: string;
  locError: string;
  searchQuery: string;
  resolvedAddress: string;
  notify: boolean;
  email: string;
  emailError: string;
  saveDevice: boolean;
  loading: boolean;
  /** Submit button's progress bar is running. */
  progress: boolean;
  done: boolean;
  code: string;
  submitError: string;
  savedOk: boolean;
}

const INITIAL: ReportFormState = {
  step: 1,
  category: null,
  subcategory: null,
  categoryError: '',
  title: '',
  titleError: '',
  desc: '',
  photos: [],
  locMode: null,
  pinPos: null,
  coords: null,
  geoError: '',
  locError: '',
  searchQuery: '',
  resolvedAddress: '',
  notify: false,
  email: '',
  emailError: '',
  saveDevice: true,
  loading: false,
  progress: false,
  done: false,
  code: '',
  submitError: '',
  savedOk: false,
};

const SUBMIT_FAILED = 'Diçka shkoi keq. Provo përsëri.';

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * All state and actions of the report form (raporto.html `Component`). `instant` becomes
 * true after the first step change: from then on new [data-reveal] blocks are shown
 * straight away, like the static page's `_revealNow()`.
 */
export function useReportForm() {
  const [state, setState] = useState<ReportFormState>(INITIAL);
  const [instant, setInstant] = useState(false);
  const update = useCallback((patch: Partial<ReportFormState>) => setState((s) => ({ ...s, ...patch })), []);
  const turnstileToken = useTurnstileToken();

  const mountedRef = useRef(true);
  /** Guards against a double submit before the `loading` re-render lands. */
  const busyRef = useRef(false);
  /** Reuse the created report and successful photos if an upload needs a retry. */
  const pendingReportRef = useRef<{ id: string; code: string; uploaded: Set<number> } | null>(null);
  /** Current photos, for revoking their object URLs on unmount. */
  const photosRef = useRef<Photo[]>([]);
  useEffect(() => {
    photosRef.current = state.photos;
  }, [state.photos]);
  const photoSeq = useRef(0);
  /** Pending reverse-geocode / search lookup; replaced (and aborted) by any newer location choice. */
  const lookupRef = useRef<AbortController | null>(null);

  const cancelLookup = useCallback(() => {
    lookupRef.current?.abort();
    lookupRef.current = null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      lookupRef.current?.abort();
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

  const goStep = useCallback(
    (step: Step) => {
      update({ step });
      setInstant(true);
      scrollToTop();
    },
    [update],
  );

  // ---- Step 1 ----
  const pickCategory = (name: string) => setState((s) => ({ ...s, category: s.category === name ? null : name, subcategory: null, categoryError: '' }));
  const pickSubcategory = (name: string) => setState((s) => ({ ...s, subcategory: s.subcategory === name ? null : name }));
  const setOtherText = (text: string) => update({ subcategory: text.slice(0, MAX_SUBCATEGORY_CHARS), categoryError: '' });
  const nextFromCategory = () => {
    if (!state.category) return update({ categoryError: 'Zgjidh një kategori' });
    if (state.category === OTHER_CATEGORY && !state.subcategory?.trim()) return update({ categoryError: 'Shkruaj llojin e problemit' });
    goStep(2);
  };

  // ---- Step 2 ----
  const setSearchQuery = (searchQuery: string) => update({ searchQuery });

  /** The typed text becomes the address as-is (like the static page); coordinates are looked up in the background. */
  const submitSearch = () => {
    const q = state.searchQuery.trim();
    if (!q) return;
    cancelLookup();
    update({ resolvedAddress: q, locMode: 'search', locError: '', coords: null, pinPos: null });
    if (q.length < 2) return;
    const ctrl = new AbortController();
    lookupRef.current = ctrl;
    searchLocations(q, 1, ctrl.signal)
      .then((places) => {
        const place = places[0];
        if (ctrl.signal.aborted || !place) return;
        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);
        if (Number.isFinite(lat) && Number.isFinite(lon)) update({ coords: { lat, lon } });
      })
      .catch(() => {
        /* no match / offline: submit falls back to the map centre */
      });
  };

  /** Demo "current location", exactly as the static page (no real geolocation there). */
  const pickCurrentLocation = () => {
    cancelLookup();
    update({ locMode: 'gps', coords: { lat: DEMO_LAT, lon: DEMO_LON }, pinPos: null, resolvedAddress: 'Pranë qendrës së Elbasanit', locError: '', geoError: '' });
  };

  const selectMapPoint = (sel: MapSelection) => {
    cancelLookup();
    const fallback = `Pikë e zgjedhur: ${sel.lat.toFixed(5)}, ${sel.lon.toFixed(5)}`;
    update({
      locMode: 'pin',
      pinPos: { x: sel.x.toFixed(1), y: sel.y.toFixed(1) },
      resolvedAddress: 'Po kërkohet adresa…',
      coords: { lat: sel.lat, lon: sel.lon },
      locError: '',
      geoError: '',
    });
    const ctrl = new AbortController();
    lookupRef.current = ctrl;
    reverseGeocode(sel.lat, sel.lon, ctrl.signal)
      .then((place) => {
        if (!ctrl.signal.aborted) update({ resolvedAddress: place.display_name || fallback });
      })
      .catch(() => {
        if (!ctrl.signal.aborted) update({ resolvedAddress: fallback });
      });
  };

  const changeLocation = () => {
    cancelLookup();
    update({ resolvedAddress: '', locMode: null, pinPos: null, coords: null, searchQuery: '', geoError: '' });
  };

  const nextFromLocation = () => {
    if (!state.resolvedAddress) return update({ locError: 'Zgjidh një vendndodhje' });
    goStep(3);
  };

  // ---- Step 3 ----
  const setTitle = (title: string) => update({ title, titleError: '' });
  const setDesc = (value: string) => update({ desc: limitWords(value) });

  // Object URLs are created here, not in a state updater (StrictMode runs updaters twice).
  const addPhotos = (files: File[]) => {
    const room = Math.max(0, MAX_PHOTOS - state.photos.length);
    const added = files.slice(0, room).map((file) => ({ id: ++photoSeq.current, url: URL.createObjectURL(file), name: file.name, file }));
    if (added.length) setState((s) => ({ ...s, photos: s.photos.concat(added) }));
  };
  const removePhoto = (id: number) => {
    const photo = state.photos.find((p) => p.id === id);
    if (photo) URL.revokeObjectURL(photo.url);
    setState((s) => ({ ...s, photos: s.photos.filter((p) => p.id !== id) }));
  };

  const nextFromDetails = () => {
    if (!state.title.trim()) return update({ titleError: 'E detyrueshme' });
    goStep(4);
  };

  // ---- Step 4 ----
  const setNotify = (notify: boolean) => update({ notify, emailError: '' });
  const setEmail = (email: string) => update({ email, emailError: '' });
  const setSaveDevice = (saveDevice: boolean) => update({ saveDevice });

  const submit = async () => {
    const s = state;
    if (s.loading || busyRef.current) return;
    const email = s.email.trim();
    if (s.notify && !EMAIL_RE.test(email)) return update({ submitError: '', emailError: email ? 'Email i pavlefshëm' : 'E detyrueshme' });

    busyRef.current = true;
    update({ loading: true, progress: true, submitError: '' });

    const title = s.title.trim();
    const coords = s.coords ?? { lat: DEMO_LAT, lon: DEMO_LON };
    const payload: ReportCreate = {
      title,
      // The backend requires a description; the form's is optional, so fall back to the title.
      description: (s.desc.trim() || title).slice(0, MAX_DESCRIPTION_CHARS),
      category: s.category ?? '',
      subcategory: s.subcategory?.trim() || undefined,
      address: s.resolvedAddress.slice(0, MAX_ADDRESS_CHARS),
      latitude: coords.lat,
      longitude: coords.lon,
      anonymous: !s.notify,
      reporter_email: s.notify ? email : undefined,
      zone_code: undefined,
      turnstile_token: turnstileToken,
    };

    try {
      let report = pendingReportRef.current;
      if (!report) {
        const { id, tracking_code: code } = await createReport(payload);
        report = { id, code, uploaded: new Set<number>() };
        pendingReportRef.current = report;
      }
      // A successful submission means every selected photo was acknowledged.
      // Retry missing photos on the same report to avoid duplicate submissions.
      for (const photo of s.photos) {
        if (report.uploaded.has(photo.id)) continue;
        await uploadReportPhoto(report.id, photo.file, report.code);
        report.uploaded.add(photo.id);
      }

      const savedOk = s.saveDevice ? saveReport({ code: report.code, title, category: s.category ?? '', date: new Date().toISOString() }) : false;
      if (!mountedRef.current) return;
      update({ loading: false, done: true, code: report.code, savedOk });
      setInstant(true);
      scrollToTop();
    } catch (err) {
      console.warn('[Raporto] submit failed', err);
      if (mountedRef.current) update({
        loading: false, progress: false,
        submitError: pendingReportRef.current
          ? `Raportimi u krijua (${pendingReportRef.current.code}), por disa foto nuk u ruajtën. Provo përsëri.`
          : SUBMIT_FAILED,
      });
    } finally {
      busyRef.current = false;
    }
  };

  const reset = () => {
    cancelLookup();
    pendingReportRef.current = null;
    state.photos.forEach((p) => URL.revokeObjectURL(p.url));
    setState(INITIAL);
    setInstant(true);
    scrollToTop();
  };

  return {
    state,
    instant,
    goStep,
    pickCategory,
    pickSubcategory,
    setOtherText,
    nextFromCategory,
    setSearchQuery,
    submitSearch,
    pickCurrentLocation,
    selectMapPoint,
    changeLocation,
    nextFromLocation,
    setTitle,
    setDesc,
    addPhotos,
    removePhoto,
    nextFromDetails,
    setNotify,
    setEmail,
    setSaveDevice,
    submit,
    reset,
  };
}

export type ReportForm = ReturnType<typeof useReportForm>;
