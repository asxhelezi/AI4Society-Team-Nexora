import { Link } from 'react-router-dom';
import { ROUTES } from '../../lib/routes';
import './CtaBand.css';

/** Dark "Sheh diçka që nuk shkon?" band with the "Raporto tani" button (Bulletini + every write-up). */
export function CtaBand() {
  return (
    <section className="artikulli-cta">
      <div className="r-wrap r-cta-band artikulli-cta__inner">
        <h2 className="artikulli-cta__title">Sheh diçka që nuk shkon?</h2>
        <Link to={ROUTES.raporto} className="tap u-hover-red artikulli-cta__button">
          <span>Raporto tani</span>
          <span className="artikulli-cta__arrow">→</span>
        </Link>
      </div>
    </section>
  );
}
