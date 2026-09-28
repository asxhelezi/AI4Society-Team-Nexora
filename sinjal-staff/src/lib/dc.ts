import { useEffect, useReducer, useRef } from 'react';

/** Dispatched on window when shared data (SINJAL.reports) changed outside a screen. */
export const DATA_CHANGED_EVENT = 'sinjal:data-changed';

/**
 * Base class for screen logic, matching the DCLogic contract the design files
 * were written against: `state`, `setState()` and a `renderVals()` that
 * returns every value (and handler) the view needs. Keeping the logic in
 * this shape means each screen's behaviour stays exactly as designed and can
 * be exercised without React (see tests/qa.test.ts).
 */
export abstract class DCLogic<P extends object = Record<string, never>, S extends object = Record<string, never>> {
  props: P;
  state = {} as S;
  /** Set by useLogic while the component is mounted. */
  onChange: (() => void) | null = null;

  constructor(props?: P) {
    this.props = (props || {}) as P;
  }

  setState(patch: Partial<S> | ((prev: S) => Partial<S>)): void {
    const next = typeof patch === 'function' ? patch(this.state) : patch;
    this.state = Object.assign({}, this.state, next);
    if (this.onChange) this.onChange();
  }

  componentDidMount?(): void;
  componentWillUnmount?(): void;

  abstract renderVals(): unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyLogic = DCLogic<any, any>;

/**
 * Instantiates a DCLogic class once and re-renders on every setState.
 *
 * componentDidMount runs right after construction, before the first render:
 * in every screen it only loads initial state (storage hand-offs, saved
 * filters), so running it early avoids rendering one empty frame.
 */
export function useLogic<L extends AnyLogic>(Ctor: new (props: L['props']) => L, props: L['props']): ReturnType<L['renderVals']> {
  const [, forceRender] = useReducer((n: number) => n + 1, 0);
  const ref = useRef<L | null>(null);
  if (ref.current === null) {
    const created = new Ctor(props);
    created.componentDidMount?.();
    ref.current = created;
  }
  const inst = ref.current;
  inst.props = props;

  useEffect(() => {
    inst.onChange = forceRender;
    // Live data (a report arriving through Supabase Realtime) re-renders every screen.
    window.addEventListener(DATA_CHANGED_EVENT, forceRender);
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, forceRender);
      inst.onChange = null;
      inst.componentWillUnmount?.();
    };
  }, [inst]);

  return inst.renderVals() as ReturnType<L['renderVals']>;
}
