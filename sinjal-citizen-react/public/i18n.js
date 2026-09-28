/*
 * Sinjal — language switching (Shqip / English / Srpski).
 *
 * The screens are authored in Albanian. Instead of rewriting every template and component,
 * this script watches the rendered page and swaps each Albanian string for its translation:
 * text nodes plus the alt / placeholder / aria-label / title attributes. That covers the
 * templates and everything built in JS (map pin cards, form errors, status labels, dates).
 *
 * How it stays in sync with the runtime: the renderer rewrites a text node back to Albanian
 * whenever it re-renders; the MutationObserver sees that and translates it again before the
 * browser paints, so there is no flicker. The original Albanian is remembered per node, so
 * switching language (or back to Albanian) is always done from the source text.
 *
 * Strings are matched on their trimmed, whitespace-collapsed form with soft hyphens removed.
 * Anything not in the dictionary (street names, tracking codes, user input) is left as is.
 * The choice is saved in localStorage ('sinjal_lang') and shared across pages and tabs.
 *
 * The toggle itself is plain markup in each header: <button data-lang="sq|en|sr">.
 */
(function () {
  'use strict';

  var LANGS = ['sq', 'en', 'sr'];
  var HTML_LANG = { sq: 'sq', en: 'en', sr: 'sr-Latn' };
  var STORAGE_KEY = 'sinjal_lang';
  var ATTRS = ['alt', 'placeholder', 'aria-label', 'title'];

  // [Albanian source, English, Serbian (Latin)]
  var ENTRIES = [
    // ---------- Navigation, header, footer ----------
    ['Kreu', 'Home', 'Početna'],
    ['Raporto', 'Report', 'Prijavi'],
    ['Harta', 'Map', 'Mapa'],
    ['Raportet e mia', 'My reports', 'Moje prijave'],
    ['Bulletini', 'Bulletin', 'Bilten'],
    ['Gjurmo', 'Track', 'Prati'],
    ['Raporto tani', 'Report now', 'Prijavi sada'],
    ['Hap menunë', 'Open menu', 'Otvori meni'],
    ['Mbyll menunë', 'Close menu', 'Zatvori meni'],
    ['Navigimi kryesor', 'Main navigation', 'Glavna navigacija'],
    ['Gjuha', 'Language', 'Jezik'],
    ['© 2026 Sinjal · Shqipëri', '© 2026 Sinjal · Albania', '© 2026 Sinjal · Albanija'],
    ['Termat e Përdorimit', 'Terms of Use', 'Uslovi korišćenja'],
    ['Politika e Privatësisë', 'Privacy Policy', 'Politika privatnosti'],
    ['Nuk mbledhim asnjë të dhënë personale. Njoftimet janë me zgjedhjen tënde.', 'We don’t collect any personal data. Notifications are your choice.', 'Ne prikupljamo nikakve lične podatke. Obaveštenja su tvoj izbor.'],
    ['Mëso më shumë.', 'Learn more.', 'Saznaj više.'],
    ['Sheh diçka që nuk shkon?', 'See something wrong?', 'Vidiš nešto što ne valja?'],

    // ---------- Home ----------
    ['Bashkia Elbasan', 'Elbasan Municipality', 'Opština Elbasan'],
    ['Sheh diçka që', 'See something', 'Vidiš nešto'],
    ['nuk shkon?', 'wrong?', 'što ne valja?'],
    ['Vetëm', 'Just', 'Samo'],
    ['sekonda', 'seconds', 'sekundi'],
    ['Vetëm 40 sekonda', 'Just 40 seconds', 'Samo 40 sekundi'],
    ['Krejtësisht', 'Completely', 'Potpuno'],
    ['anonim', 'anonymous', 'anonimno'],
    ['Krejtësisht anonim', 'Completely anonymous', 'Potpuno anonimno'],
    ['Bëhu pjesë e zgjidhjes', 'Your signal, our action', 'Budi deo rešenja'],
    ['Mbështetur nga', 'Supported by', 'Uz podršku'],
    ['Probleme të zgjidhura', 'Problems solved', 'Rešenih problema'],
    ['Të gjitha problemet e zgjidhura', 'All solved problems', 'Svi rešeni problemi'],
    ['Si funksionon', 'How it works', 'Kako funkcioniše'],
    ['Plotëso formularin', 'Fill in the form', 'Popuni formular'],
    ['Përshkruaj shqetësimin, shto një foto dhe vendndodhjen.', 'Describe the issue, add a photo and the location.', 'Opiši problem, dodaj fotografiju i lokaciju.'],
    ['Kërkesa procesohet', 'The request is processed', 'Zahtev se obrađuje'],
    ['Bashkia e Elbasanit verifikon dhe ia kalon zyrës përgjegjëse.', 'Elbasan Municipality verifies it and passes it to the responsible office.', 'Opština Elbasan ga proverava i prosleđuje nadležnoj službi.'],
    ['Problemi zgjidhet', 'The problem gets solved', 'Problem se rešava'],
    ['Ndiq ecurinë me numrin e gjurmimit deri sa të përfundojë.', 'Follow its progress with the tracking number until it’s done.', 'Prati napredak pomoću broja za praćenje dok se ne završi.'],
    ['Gjurmo një raportim', 'Track a report', 'Prati prijavu'],
    ['Numri i gjurmimit ndodhet në konfirmimin e raportimit.', 'The tracking number is in your report confirmation.', 'Broj za praćenje nalazi se u potvrdi prijave.'],
    ['Numri i gjurmimit', 'Tracking number', 'Broj za praćenje'],
    ['Çfarë është numri i gjurmimit?', 'What is the tracking number?', 'Šta je broj za praćenje?'],
    ['Shiko raportet e mia', 'See my reports', 'Pogledaj moje prijave'],

    // ---------- Categories ----------
    ['Trafik', 'Traffic', 'Saobraćaj'],
    ['Ndriçim', 'Lighting', 'Osvetljenje'],
    ['Infrastrukturë', 'Infrastructure', 'Infrastruktura'],
    ['Mbetje', 'Waste', 'Otpad'],
    ['Rrugë', 'Roads', 'Putevi'],
    ['Mjedis', 'Environment', 'Životna sredina'],
    ['Ndërtesa', 'Buildings', 'Zgrade'],
    ['Administratë', 'Administration', 'Administracija'],
    ['Ujë', 'Water', 'Voda'],
    ['Tjetër', 'Other', 'Drugo'],
    ['Trafik & Sinjalistikë', 'Traffic & Signage', 'Saobraćaj i signalizacija'],
    ['Hapësira të gjelbra', 'Green spaces', 'Zelene površine'],
    ['Hapësira publike', 'Public spaces', 'Javne površine'],
    ['Ujë & Kanalizime', 'Water & Sewage', 'Voda i kanalizacija'],

    // ---------- Subcategories ----------
    ['Gropë në rrugë', 'Pothole', 'Rupa na putu'],
    ['Trotuar i dëmtuar', 'Damaged sidewalk', 'Oštećen trotoar'],
    ['Pusetë e dëmtuar', 'Damaged manhole', 'Oštećen šaht'],
    ['Asfalt i dëmtuar', 'Damaged asphalt', 'Oštećen asfalt'],
    ['Mbetje të grumbulluara', 'Piled-up waste', 'Nagomilan otpad'],
    ['Kosh i tejmbushur', 'Overflowing bin', 'Prepuna kanta'],
    ['Mungesë koshash', 'Missing bins', 'Nedostaju kante'],
    ['Hedhje e paligjshme mbetjesh', 'Illegal dumping', 'Nelegalno odlaganje otpada'],
    ['Ndriçim jo funksional', 'Lighting not working', 'Osvetljenje ne radi'],
    ['Shtyllë e dëmtuar', 'Damaged pole', 'Oštećen stub'],
    ['Errësirë e zgjatur', 'Prolonged darkness', 'Dugotrajan mrak'],
    ['Ndriçim me ndërprerje', 'Intermittent lighting', 'Isprekidano osvetljenje'],
    ['Semafor jo funksional', 'Traffic light not working', 'Semafor ne radi'],
    ['Sinjalistikë e dëmtuar ose e munguar', 'Damaged or missing signage', 'Oštećena ili nedostajuća signalizacija'],
    ['Vija të fshira kalimi këmbësorësh', 'Faded pedestrian crossing', 'Izbledeo pešački prelaz'],
    ['Parkim i parregullt', 'Illegal parking', 'Nepropisno parkiranje'],
    ['Bimësi e neglizhuar', 'Neglected vegetation', 'Zapuštena vegetacija'],
    ['Pemë e rrëzuar ose e rrezikshme', 'Fallen or dangerous tree', 'Palo ili opasno drvo'],
    ['Pajisje lojrash e dëmtuar', 'Damaged play equipment', 'Oštećena oprema za igru'],
    ['Mungesë ujitjeje', 'Lack of watering', 'Nedostatak zalivanja'],
    ['Mobilje urbane e dëmtuar', 'Damaged street furniture', 'Oštećen urbani mobilijar'],
    ['Vandalizëm', 'Vandalism', 'Vandalizam'],
    ['Aksesueshmëri e kufizuar', 'Limited accessibility', 'Ograničena pristupačnost'],
    ['Mungesë mirëmbajtjeje', 'Lack of maintenance', 'Nedostatak održavanja'],
    ['Rrjedhje uji', 'Water leak', 'Curenje vode'],
    ['Kanalizim i bllokuar', 'Blocked sewer', 'Zapušena kanalizacija'],
    ['Ndërprerje e furnizimit me ujë', 'Water supply outage', 'Prekid snabdevanja vodom'],
    ['Vërshim ose pellgëzim uji', 'Flooding or standing water', 'Plavljenje ili zadržavanje vode'],
    ['Vonesë në shërbim', 'Service delay', 'Kašnjenje usluge'],
    ['Informacion i pasaktë', 'Incorrect information', 'Netačne informacije'],
    ['Sjellje jo profesionale', 'Unprofessional conduct', 'Neprofesionalno ponašanje'],
    ['Problem me dokumentacion', 'Documentation issue', 'Problem sa dokumentacijom'],

    // ---------- Statuses ----------
    ['Zgjidhur', 'Resolved', 'Rešeno'],
    ['Në pritje', 'Pending', 'Na čekanju'],
    ['NË PRITJE', 'PENDING', 'NA ČEKANJU'],
    ['Dërguar', 'Submitted', 'Poslato'],
    ['Verifikuar', 'Verified', 'Verifikovano'],
    ['Në proces', 'In progress', 'U toku'],
    ['Përfunduar', 'Completed', 'Završeno'],
    ['Refuzuar', 'Rejected', 'Odbijeno'],
    ['Marrë në shqyrtim', 'Under review', 'U razmatranju'],

    // ---------- Resolved cases (bulletin, write-ups, map pins) ----------
    ['Rikthehet shenja rrugore në Elbasan-Çërrik', 'Road sign restored on the Elbasan–Çërrik road', 'Vraćen saobraćajni znak na putu Elbasan–Çërrik'],
    ['Rikthehet ndriçimi në rrugën Aleks Vini', 'Street lighting restored on Rruga Aleks Vini', 'Vraćeno osvetljenje u ulici Aleks Vini'],
    ['Zhbllokohet kanali kullues në rrugën e Teqes', 'Drainage channel cleared on Rruga e Teqes', 'Očišćen odvodni kanal u ulici Rruga e Teqes'],
    ['Trotuari i riparuar në Shëtitoren Aqif Pasha', 'Sidewalk repaired on the Aqif Pasha promenade', 'Popravljen trotoar na šetalištu Aqif Pasha'],
    ['Riparohet gropa në rrugën 28 Nëntori', 'Pothole repaired on Rruga 28 Nëntori', 'Popravljena rupa u ulici 28 Nëntori'],
    ['Pastrohet rruga Ptoleme Xhuvani nga mbetjet', 'Rruga Ptoleme Xhuvani cleared of waste', 'Ulica Ptoleme Xhuvani očišćena od otpada'],
    ['Rikthehet shenja rrugore', 'Road sign restored', 'Vraćen saobraćajni znak'],
    ['Rikthehet ndriçimi', 'Lighting restored', 'Vraćeno osvetljenje'],
    ['Zhbllokohet kanali kullues', 'Drainage channel cleared', 'Očišćen odvodni kanal'],
    ['Trotuari i riparuar', 'Sidewalk repaired', 'Popravljen trotoar'],
    ['Riparohet gropa', 'Pothole repaired', 'Popravljena rupa'],
    ['Pastrohet nga mbetjet', 'Cleared of waste', 'Očišćeno od otpada'],
    ['Gropë e thellë', 'Deep pothole', 'Duboka rupa'],
    ['Shtylla ndriçimi pa dritë', 'Street lights out', 'Ulična rasveta ne radi'],
    ['Koshat nuk grumbullohen', 'Bins not being emptied', 'Kante se ne prazne'],
    ['Pemë e rrëzuar bllokon trotuarin', 'Fallen tree blocks the sidewalk', 'Palo drvo blokira trotoar'],
    ['Problemet e zgjidhura nga Bashkia Elbasan, me ecurinë e plotë të secilit rast.', 'Problems solved by Elbasan Municipality, with the full history of each case.', 'Problemi koje je rešila Opština Elbasan, sa kompletnim tokom svakog slučaja.'],
    ['Raportuar', 'Reported', 'Prijavljeno'],
    ['Kategoria', 'Category', 'Kategorija'],
    ['Raportimi', 'Report', 'Prijava'],
    ['Para', 'Before', 'Pre'],
    ['Pas', 'After', 'Posle'],
    ['para', 'before', 'pre'],
    ['pas', 'after', 'posle'],
    ['PARA', 'BEFORE', 'PRE'],
    ['PAS', 'AFTER', 'POSLE'],
    ['Të tjera të zgjidhura', 'Other solved cases', 'Drugi rešeni slučajevi'],

    // Write-up paragraphs
    ['Shenja e ndalimit në hyrje të rrugës Elbasan-Çërrik ishte rrëzuar nga një automjet dhe kishte mbetur e shtrirë në buzë të rrugës për disa ditë.',
     'The stop sign at the entrance to the Elbasan–Çërrik road had been knocked down by a vehicle and lay at the roadside for several days.',
     'Znak stop na ulazu u put Elbasan–Çërrik oborilo je vozilo i danima je ležao pored puta.'],
    ['Drejtoria e Trafikut Rrugor e klasifikoi si rrezik të menjëhershëm për kryqëzimin dhe e zëvendësoi brenda 48 orësh me një shtyllë të re të përforcuar.',
     'The Road Traffic Directorate classified it as an immediate hazard for the junction and replaced it within 48 hours with a new, reinforced post.',
     'Direkcija za drumski saobraćaj ocenila ga je kao neposrednu opasnost za raskrsnicu i u roku od 48 sati zamenila novim, ojačanim stubom.'],
    ['Shenjëzimi funksionon normalisht që prej fillimit të javës.', 'The signage has been working normally since the start of the week.', 'Signalizacija normalno radi od početka nedelje.'],
    ['Katër nga gjashtë shtyllat e ndriçimit përgjatë rrugës Aleks Vini kishin mbetur pa punuar prej javësh, duke lënë segmentin në errësirë të plotë pas orës 20:00.',
     'Four of the six street lights along Rruga Aleks Vini had been out for weeks, leaving the stretch in complete darkness after 8 p.m.',
     'Četiri od šest uličnih svetiljki duž ulice Aleks Vini nedeljama nisu radile, pa je deonica posle 20:00 bila u potpunom mraku.'],
    ['Ndërmarrja e Ndriçimit Publik identifikoi një defekt në linjën ushqyese dhe e riparoi atë brenda një jave.',
     'The Public Lighting Company found a fault in the supply line and repaired it within a week.',
     'Preduzeće za javnu rasvetu pronašlo je kvar na napojnom vodu i popravilo ga u roku od nedelju dana.'],
    ['Ndriçimi funksionon normalisht që nga mesi i gushtit.', 'The lighting has been working normally since mid-August.', 'Osvetljenje normalno radi od sredine avgusta.'],
    ['Kanali kullues përgjatë rrugës së Teqes ishte bllokuar nga gjethe e mbeturina, duke shkaktuar përmbytje të vogla pas çdo shiu.',
     'The drainage channel along Rruga e Teqes was blocked by leaves and debris, causing minor flooding after every rain.',
     'Odvodni kanal duž ulice Rruga e Teqes bio je zapušen lišćem i smećem, pa je posle svake kiše dolazilo do manjih poplava.'],
    ['Drejtoria e Shërbimeve Publike pastroi pusetat dhe kanalin kryesor, duke rikthyer kullimin normal të ujërave.',
     'The Public Services Directorate cleaned the drains and the main channel, restoring normal drainage.',
     'Direkcija za javne usluge očistila je šahtove i glavni kanal i vratila normalno odvodnjavanje.'],
    ['Pllakat e ngritura përgjatë Shëtitores Aqif Pasha kishin shkaktuar disa rrëzime këmbësorësh, veçanërisht mbrëmjeve kur ndriçimi është më i dobët.',
     'Raised paving slabs along the Aqif Pasha promenade had caused several pedestrians to fall, especially in the evenings when the lighting is weaker.',
     'Podignute ploče duž šetališta Aqif Pasha izazvale su nekoliko padova pešaka, naročito uveče kada je osvetljenje slabije.'],
    ['Bashkia Elbasan rishtroi segmentin 40-metërsh dhe shtoi një rampë të re për karrocat.',
     'Elbasan Municipality relaid the 40-metre stretch and added a new ramp for wheelchairs and strollers.',
     'Opština Elbasan ponovo je popločala deonicu od 40 metara i dodala novu rampu za kolica.'],
    ['Segmenti është plotësisht i sheshtë dhe i sigurt që prej fillimit të shtatorit.', 'The stretch has been completely level and safe since early September.', 'Deonica je potpuno ravna i bezbedna od početka septembra.'],
    ['Gropa e thellë në rrugën 28 Nëntori ishte bërë rrezik i vazhdueshëm për automjetet dhe motoçiklistët që kalonin aty çdo ditë.',
     'The deep pothole on Rruga 28 Nëntori had become a constant hazard for the cars and motorcyclists passing through every day.',
     'Duboka rupa u ulici 28 Nëntori postala je stalna opasnost za vozila i motocikliste koji tuda svakodnevno prolaze.'],
    ['Pas raportimit, Bashkia Elbasan e klasifikoi si ndërhyrje urgjente dhe e asfaltoi brenda dy ditësh.',
     'After the report, Elbasan Municipality classified it as an urgent job and resurfaced it within two days.',
     'Nakon prijave, Opština Elbasan ju je svrstala u hitne intervencije i asfaltirala u roku od dva dana.'],
    ['Mbetjet e grumbulluara përgjatë rrugës Ptoleme Xhuvani, të lëna pas një aktiviteti në zonë, kishin mbetur të papastruara për ditë të tëra.',
     'Waste piled up along Rruga Ptoleme Xhuvani after an event in the area had been left uncollected for days.',
     'Otpad nagomilan duž ulice Ptoleme Xhuvani posle jednog događaja u tom delu grada danima nije bio uklonjen.'],
    ['Ekipi i pastrimit të Bashkisë Elbasan e pastroi plotësisht segmentin dhe shtoi kalime më të shpeshta të fshesave rrugore.',
     'Elbasan Municipality’s cleaning crew cleared the whole stretch and added more frequent street-sweeper runs.',
     'Ekipa za čišćenje Opštine Elbasan potpuno je očistila deonicu i uvela češće prolaske mašina za čišćenje ulica.'],

    // ---------- Map (Harta) ----------
    ['Rreth teje', 'Around you', 'Oko tebe'],
    ['Harta e raportimeve', 'Report map', 'Mapa prijava'],
    ['Raportimet nuk mund të ngarkoheshin.', 'Reports could not be loaded.', 'Prijave nije moguće učitati.'],
    ['Nuk ka ende raportime në hartë.', 'There are no reports on the map yet.', 'Još nema prijava na mapi.'],
    ['Lejo qasjen në vendndodhje për të parë raportimet aktive pranë teje.', 'Allow location access to see active reports near you.', 'Dozvoli pristup lokaciji da vidiš aktivne prijave u blizini.'],
    ['Lejo qasjen në vendndodhje?', 'Allow location access?', 'Dozvoliti pristup lokaciji?'],
    ['Sinjal do të të pozicionojë pranë raportimeve aktive në Elbasan.', 'Sinjal will place you near active reports in Elbasan.', 'Sinjal će te postaviti blizu aktivnih prijava u Elbasanu.'],
    ['Sinjal kërkon vendndodhjen tënde reale nga pajisja, për të treguar raportet pranë teje.', 'Sinjal uses your device’s real location to show reports near you.', 'Sinjal koristi stvarnu lokaciju tvog uređaja da prikaže prijave u blizini.'],
    ['Lejo', 'Allow', 'Dozvoli'],
    ['Jo tani', 'Not now', 'Ne sada'],
    ['Vendndodhja nuk u gjet', 'Location not found', 'Lokacija nije pronađena'],
    ['Duke kërkuar vendndodhjen tënde…', 'Finding your location…', 'Tražimo tvoju lokaciju…'],
    ['Duke t’u afruar…', 'Zooming in…', 'Približavamo se…'],
    ["Duke t'u afruar…", 'Zooming in…', 'Približavamo se…'],
    ['Zmadho', 'Zoom in', 'Uvećaj'],
    ['Zvogëlo', 'Zoom out', 'Umanji'],
    ['Zmadho hartën', 'Zoom in on the map', 'Uvećaj mapu'],
    ['Zvogëlo hartën', 'Zoom out of the map', 'Umanji mapu'],
    ['Mbyll', 'Close', 'Zatvori'],
    ['Lexo më shumë →', 'Read more →', 'Pročitaj više →'],
    ['Gjurmo këtë raportim →', 'Track this report →', 'Prati ovu prijavu →'],

    // ---------- My reports ----------
    ['Ruajtur në këtë pajisje', 'Saved on this device', 'Sačuvano na ovom uređaju'],
    ['Raportim pa titull', 'Untitled report', 'Prijava bez naslova'],
    ['Pastro listën e ruajtur', 'Clear saved list', 'Obriši sačuvanu listu'],
    ['Nuk ke asnjë raportim të ruajtur në këtë pajisje. Aktivizo "Ruaje raportimin në këtë pajisje" herën tjetër kur raporton.',
     'You have no reports saved on this device. Turn on “Save report on this device” next time you report.',
     'Nemaš sačuvanih prijava na ovom uređaju. Uključi „Sačuvaj prijavu na ovom uređaju” sledeći put kada prijavljuješ.'],
    ['Fillo një raportim', 'Start a report', 'Započni prijavu'],
    ['Kërko me numrin e gjurmimit për të parë ecurinë e çdo raportimi, edhe nëse nuk është ruajtur këtu.',
     'Search by tracking number to see the progress of any report, even if it isn’t saved here.',
     'Pretraži po broju za praćenje da vidiš napredak bilo koje prijave, čak i ako nije sačuvana ovde.'],
    ['Të fshihet lista e raportimeve të ruajtura në këtë pajisje?', 'Delete the list of reports saved on this device?', 'Obrisati listu prijava sačuvanih na ovom uređaju?'],

    // ---------- Track (Gjurmo) ----------
    ['Arsyeja e refuzimit', 'Reason for rejection', 'Razlog odbijanja'],
    ['Bashkia', 'Municipality', 'Opština'],
    ['Vendndodhja', 'Location', 'Lokacija'],
    ['Përshkrimi', 'Description', 'Opis'],
    ['Shiko zgjidhjen', 'See the solution', 'Pogledaj rešenje'],
    ['← Te raportet e mia', '← Back to my reports', '← Nazad na moje prijave'],
    ['Nuk u gjet asnjë raportim me', 'No report found with', 'Nije pronađena prijava sa brojem'],
    ['Raportim i ri', 'New report', 'Nova prijava'],
    ['Tiranë', 'Tirana', 'Tirana'],
    ['Durrës', 'Durrës', 'Drač'],
    ['Shkodër', 'Shkodër', 'Skadar'],
    ['Vlorë', 'Vlorë', 'Valona'],
    ['Korçë', 'Korçë', 'Korča'],
    ['Zyra e Gjendjes Civile', 'Civil Registry Office', 'Matična služba'],
    ['Dymbëdhjetë shtylla ndriçimi pa punuar mes Zogut të Zi dhe ish-Bllokut.', 'Twelve street lights out between Zogu i Zi and the former Blloku.', 'Dvanaest uličnih svetiljki ne radi između Zogu i Zi i bivšeg Bloku.'],
    ['Gropë me diametër rreth një metër afër kryqëzimit me Rrugën Taulantia.', 'A pothole about a metre wide near the junction with Rruga Taulantia.', 'Rupa prečnika oko jednog metra blizu raskrsnice sa ulicom Taulantia.'],
    ['Kosha me kapak të prishur që mbushen brenda pak orësh.', 'Bins with broken lids that fill up within a few hours.', 'Kante sa polomljenim poklopcima koje se napune za nekoliko sati.'],
    ['Pllaka të ngritura përpara hyrjes së plazhit publik.', 'Raised paving slabs in front of the public beach entrance.', 'Podignute ploče ispred ulaza na javnu plažu.'],
    ['Pusetat nuk kullojnë pas shiut; rruga mbetet nën ujë.', 'The drains don’t clear after rain; the street stays flooded.', 'Šahtovi ne odvode vodu posle kiše; ulica ostaje pod vodom.'],
    ['Vizat e kalimit për këmbësorë përballë shkollës janë fshirë plotësisht.', 'The pedestrian crossing lines opposite the school have completely faded.', 'Linije pešačkog prelaza preko puta škole potpuno su izbledele.'],
    ['Gropë e thellë afër ndërprerjes me rrugën dytësore, rrezikon automjetet.', 'A deep pothole near the junction with the side street, a danger to vehicles.', 'Duboka rupa blizu raskrsnice sa sporednom ulicom, opasna za vozila.'],
    ['Disa shtylla ndriçimi pa dritë prej më shumë se një jave.', 'Several street lights have been out for more than a week.', 'Nekoliko uličnih svetiljki ne radi više od nedelju dana.'],
    ['Koshat mbushen çdo ditë dhe nuk grumbullohen rregullisht.', 'Bins fill up every day and aren’t emptied regularly.', 'Kante se pune svakog dana i ne prazne se redovno.'],
    ['Pllaka trotuari të thyera përgjatë një segmenti prej 30 metrash.', 'Broken sidewalk slabs along a 30-metre stretch.', 'Polomljene ploče trotoara duž deonice od 30 metara.'],
    ['Një pemë e rrëzuar nga era bllokon pjesërisht trotuarin.', 'A tree blown down by the wind partly blocks the sidewalk.', 'Drvo koje je oborio vetar delimično blokira trotoar.'],
    ['Suva e rënë nga fasada e një ndërtese rrezikon këmbësorët.', 'Plaster falling from a building façade is a danger to pedestrians.', 'Malter koji otpada sa fasade zgrade ugrožava pešake.'],
    ['Kërkesë e dyfishtë e trajtuar tashmë nëpërmjet një aplikimi tjetër zyrtar.', 'Duplicate request, already handled through another official application.', 'Duplikat zahteva, već rešen kroz drugi zvanični zahtev.'],
    ['Rasti është jashtë fushës së shërbimeve që trajton Sinjal.', 'This case is outside the services Sinjal handles.', 'Slučaj je van usluga kojima se Sinjal bavi.'],
    ['Raportim në shqyrtim nga zyra përgjegjëse e Bashkisë Elbasan.', 'Report under review by the responsible office of Elbasan Municipality.', 'Prijavu razmatra nadležna služba Opštine Elbasan.'],
    ['Nuk përputhet me kriteret e raportimit publik.', 'Doesn’t meet the criteria for public reporting.', 'Ne ispunjava kriterijume za javno prijavljivanje.'],

    // ---------- Report form (Raporto) ----------
    ['Çfarë problemi dëshiron të raportosh?', 'What problem do you want to report?', 'Koji problem želiš da prijaviš?'],
    ['Ku ndodhet problemi?', 'Where is the problem?', 'Gde se nalazi problem?'],
    ['Detajet e raportimit', 'Report details', 'Detalji prijave'],
    ['Kontrollo raportimin', 'Review your report', 'Proveri prijavu'],
    ['Kontrolli & Dërgimi', 'Review & Submit', 'Provera i slanje'],
    ['Mbrapa', 'Back', 'Nazad'],
    ['Nënkategoria', 'Subcategory', 'Potkategorija'],
    ['opsionale', 'optional', 'opciono'],
    ['Opsionale', 'Optional', 'Opciono'],
    ['Vazhdo', 'Continue', 'Nastavi'],
    ['Zgjidh një kategori', 'Choose a category', 'Izaberi kategoriju'],
    ['Shkruaj llojin e problemit', 'Describe the type of problem', 'Opiši vrstu problema'],
    ['Çfarë lloj problemi është?', 'What kind of problem is it?', 'Koja je vrsta problema?'],
    ['p.sh. Zhurmë nga ndërtimet natën', 'e.g. Construction noise at night', 'npr. Buka od gradnje noću'],
    ['Kërko një adresë...', 'Search for an address...', 'Potraži adresu...'],
    ['Kërko', 'Search', 'Traži'],
    ['Përdor vendndodhjen aktuale', 'Use current location', 'Koristi trenutnu lokaciju'],
    ['— ose vendos pikën në hartë —', '— or drop a pin on the map —', '— ili postavi tačku na mapi —'],
    ['Vendos pikën e vendndodhjes në hartë', 'Place the location pin on the map', 'Postavi tačku lokacije na mapi'],
    ['Trokit për të vendosur pikën', 'Tap to place the pin', 'Dodirni da postaviš tačku'],
    ['Adresa e identifikuar', 'Identified address', 'Prepoznata adresa'],
    ['Ndrysho', 'Change', 'Izmeni'],
    ['Zgjidh një vendndodhje', 'Choose a location', 'Izaberi lokaciju'],
    ['Pranë qendrës së Elbasanit', 'Near Elbasan city centre', 'Blizu centra Elbasana'],
    ['Po kërkohet adresa…', 'Looking up the address…', 'Tražimo adresu…'],
    ['Titulli', 'Title', 'Naslov'],
    ['P.sh. Gropë e madhe në asfalt', 'E.g. Large pothole in the asphalt', 'Npr. Velika rupa u asfaltu'],
    ['E detyrueshme', 'Required', 'Obavezno'],
    ['Përshkruaj problemin...', 'Describe the problem...', 'Opiši problem...'],
    ['Foto', 'Photos', 'Fotografije'],
    ['Shto foto', 'Add photos', 'Dodaj fotografije'],
    ['Hiq foton', 'Remove photo', 'Ukloni fotografiju'],
    ['Pa foto', 'No photos', 'Bez fotografija'],
    ['Ruaj raportimin në këtë pajisje', 'Save report on this device', 'Sačuvaj prijavu na ovom uređaju'],
    ['Njoftohu për përditësime për këtë raport', 'Get notified about updates to this report', 'Primaj obaveštenja o ovoj prijavi'],
    ['Email', 'Email', 'E-pošta'],
    ['Shkruaj adresën e emailit...', 'Enter your email address...', 'Unesi svoju e-adresu...'],
    ['Email i pavlefshëm', 'Invalid email', 'Neispravna e-adresa'],
    ['Dërgo raportimin', 'Submit report', 'Pošalji prijavu'],
    ['Duke dërguar', 'Submitting', 'Slanje u toku'],
    ['Diçka shkoi keq. Provo përsëri.', 'Something went wrong. Please try again.', 'Nešto nije u redu. Pokušaj ponovo.'],
    ['Raportimi u dërgua', 'Report submitted', 'Prijava je poslata'],
    ['Sinjali juaj u mor.', 'Your signal has been received.', 'Tvoj signal je primljen.'],
    ['Statusi', 'Status', 'Status'],
    ['Kopjo', 'Copy', 'Kopiraj'],
    ['U kopjua', 'Copied', 'Kopirano'],
    ['Njoftimet shkojnë te', 'Notifications go to', 'Obaveštenja idu na'],
    ['U ruajt edhe në këtë pajisje — shikoje te', 'Also saved on this device — find it in', 'Sačuvano i na ovom uređaju — pronađi je u'],
    ['Nuk u ruajt dot në këtë pajisje — shënoje numrin e gjurmimit diku, sepse s\'do ta shohësh te Raportet e mia.',
     'Couldn’t save it on this device — write the tracking number down somewhere, because it won’t appear in My reports.',
     'Nije sačuvano na ovom uređaju — zapiši negde broj za praćenje, jer se neće pojaviti u Mojim prijavama.'],
    ['Shiko raportimin', 'View report', 'Pogledaj prijavu'],
  ];

  var MONTHS = {
    sq: ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    sr: ['januar', 'februar', 'mart', 'april', 'maj', 'jun', 'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'],
  };

  function norm(s) { return s.replace(/­/g, '').replace(/\s+/g, ' ').trim(); }

  var DICT = { en: {}, sr: {} };
  ENTRIES.forEach(function (e) { var k = norm(e[0]); DICT.en[k] = e[1]; DICT.sr[k] = e[2]; });

  var DATE_RE = new RegExp('^(\\d{1,2}) (' + MONTHS.sq.join('|') + ') (\\d{4})$');

  // Strings assembled at runtime ("Hapi 2 nga 4 · Vendndodhja", "3/100 fjalë", dates…).
  function translateKey(key, lang) {
    var d = DICT[lang];
    if (Object.prototype.hasOwnProperty.call(d, key)) return d[key];
    var m;
    if ((m = key.match(DATE_RE))) {
      var mon = MONTHS[lang][MONTHS.sq.indexOf(m[2])];
      return lang === 'sr' ? m[1] + '. ' + mon + ' ' + m[3] + '.' : m[1] + ' ' + mon + ' ' + m[3];
    }
    if ((m = key.match(/^Hapi (\d+) nga (\d+) · (.+)$/))) {
      var name = translateKey(m[3], lang) || m[3];
      return (lang === 'sr' ? 'Korak ' + m[1] + ' od ' : 'Step ' + m[1] + ' of ') + m[2] + ' · ' + name;
    }
    if ((m = key.match(/^(\d+)\/100 fjalë$/))) return m[1] + (lang === 'sr' ? '/100 reči' : '/100 words');
    if ((m = key.match(/^(\d+) foto$/))) return m[1] + ' ' + plural(+m[1], lang, ['photo', 'photos'], ['fotografija', 'fotografije', 'fotografija']);
    if ((m = key.match(/^Pikë e zgjedhur: (.+)$/))) return (lang === 'sr' ? 'Izabrana tačka: ' : 'Selected point: ') + m[1];
    // Composite labels: "Kategoria · opsionale", "Sinjal — Harta", "<title> — para".
    var seps = [' · ', ' — '];
    for (var i = 0; i < seps.length; i++) {
      if (key.indexOf(seps[i]) === -1) continue;
      var changed = false;
      var parts = key.split(seps[i]).map(function (p) {
        var t = translateKey(p, lang);
        if (t != null) { changed = true; return t; }
        return p;
      });
      if (changed) return parts.join(seps[i]);
    }
    return null;
  }

  function plural(n, lang, en, sr) {
    if (lang === 'en') return n === 1 ? en[0] : en[1];
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return sr[0];
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return sr[1];
    return sr[2];
  }

  // Translate a raw string, keeping its surrounding whitespace. null = leave unchanged.
  function translate(raw, lang) {
    if (lang === 'sq' || !raw) return null;
    var key = norm(raw);
    if (!key) return null;
    var t = translateKey(key, lang);
    if (t == null) return null;
    var lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
    return lead + t + trail;
  }

  // ---------------------------------------------------------------------------------
  var lang = readLang();
  var textRec = new WeakMap(); // Text node -> { src, out }
  var attrRec = new WeakMap(); // Element   -> { [attr]: { src, out } }
  // [React port] The SPA changes document.title on every route, so the source title is
  // re-read whenever the title differs from the last translation this script wrote.
  var titleSrc = null, titleOut = null;

  // [React port] ?lang=sq|en|sr picks (and saves) the language, e.g. for shared links.
  function readLang() {
    try {
      var q = new URLSearchParams(location.search).get('lang');
      if (q && LANGS.indexOf(q) !== -1) { localStorage.setItem(STORAGE_KEY, q); return q; }
    } catch (e) {}
    return readStored();
  }

  function readStored() {
    var l = null;
    try { l = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    return LANGS.indexOf(l) === -1 ? 'sq' : l;
  }

  function skipped(node) {
    var el = node.nodeType === 1 ? node : node.parentElement;
    return !el || !!el.closest('script,style,template,[translate="no"]');
  }

  function doText(node, force) {
    var cur = node.nodeValue, rec = textRec.get(node);
    if (!cur || !/\S/.test(cur)) return;
    if (rec && cur === rec.out && !force) return;
    var src = (rec && cur === rec.out) ? rec.src : cur;
    var t = translate(src, lang);
    var out = t == null ? src : t;
    textRec.set(node, { src: src, out: out });
    if (out !== cur) node.nodeValue = out;
  }

  function doAttr(el, name, force) {
    var cur = el.getAttribute(name);
    if (cur == null) return;
    var recs = attrRec.get(el) || {};
    var rec = recs[name];
    if (rec && cur === rec.out && !force) return;
    var src = (rec && cur === rec.out) ? rec.src : cur;
    var t = translate(src, lang);
    var out = t == null ? src : t;
    recs[name] = { src: src, out: out };
    attrRec.set(el, recs);
    if (out !== cur) el.setAttribute(name, out);
  }

  function walk(root, force) {
    if (root.nodeType === 3) { if (!skipped(root)) doText(root, force); return; }
    if (root.nodeType !== 1 || skipped(root)) return;
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (n.nodeType === 1 && /^(SCRIPT|STYLE|TEMPLATE)$/.test(n.tagName)) return NodeFilter.FILTER_REJECT;
        if (n.nodeType === 1 && n.getAttribute('translate') === 'no') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    var n = root;
    do {
      if (n.nodeType === 3) doText(n, force);
      else for (var i = 0; i < ATTRS.length; i++) if (n.hasAttribute(ATTRS[i])) doAttr(n, ATTRS[i], force);
    } while ((n = tw.nextNode()));
  }

  function syncChrome() {
    document.documentElement.lang = HTML_LANG[lang];
    if (document.title !== titleOut) titleSrc = document.title;
    var t = translate(titleSrc, lang);
    titleOut = t == null ? titleSrc : t;
    if (document.title !== titleOut) document.title = titleOut;
    var btns = document.querySelectorAll('[data-lang]');
    for (var i = 0; i < btns.length; i++) {
      var on = String(btns[i].getAttribute('data-lang') === lang);
      if (btns[i].getAttribute('aria-pressed') !== on) btns[i].setAttribute('aria-pressed', on);
    }
  }

  function setLang(next, persist) {
    if (LANGS.indexOf(next) === -1 || next === lang) return;
    lang = next;
    if (persist) { try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {} }
    walk(document.body, true);
    syncChrome();
  }

  var observer = new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (r.type === 'characterData') { if (!skipped(r.target)) doText(r.target); }
      else if (r.type === 'attributes') { if (!skipped(r.target)) doAttr(r.target, r.attributeName); }
      else for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]);
    }
    syncChrome();
  });

  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  // [React port] Title changes happen in <head>, outside the body observer.
  new MutationObserver(syncChrome).observe(document.head, { subtree: true, childList: true, characterData: true });
  walk(document.body);
  syncChrome();

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-lang]');
    if (b) setLang(b.getAttribute('data-lang'), true);
  });

  // Keep every open tab on the same language.
  window.addEventListener('storage', function (e) { if (e.key === STORAGE_KEY) setLang(readStored(), false); });

  // Native confirm() dialogs are the one piece of copy that never reaches the DOM.
  var nativeConfirm = window.confirm;
  window.confirm = function (msg) {
    var t = typeof msg === 'string' ? translate(msg, lang) : null;
    return nativeConfirm.call(window, t == null ? msg : t);
  };

  window.SinjalI18n = { get lang() { return lang; }, setLang: function (l) { setLang(l, true); }, t: function (s) { var t = translate(s, lang); return t == null ? s : t; } };
})();
