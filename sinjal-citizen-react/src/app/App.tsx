import { Route, Routes } from 'react-router-dom';
import { LegacyRedirect } from '../components/LegacyRedirect';
import { ScrollToTop } from '../components/ScrollToTop';
import { LEGACY_PATHS, ROUTES } from '../lib/routes';
import { Artikulli } from '../pages/Artikulli/Artikulli';
import { Bulletini } from '../pages/Bulletini/Bulletini';
import { Gjurmo } from '../pages/Gjurmo/Gjurmo';
import { Harta } from '../pages/Harta/Harta';
import { Kreu } from '../pages/Kreu/Kreu';
import { Raporto } from '../pages/Raporto/Raporto';
import { RaportetEMia } from '../pages/RaportetEMia/RaportetEMia';

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path={ROUTES.kreu} element={<Kreu />} />
        <Route path={ROUTES.raporto} element={<Raporto />} />
        <Route path={ROUTES.harta} element={<Harta />} />
        <Route path={ROUTES.raportetEMia} element={<RaportetEMia />} />
        <Route path={ROUTES.gjurmo} element={<Gjurmo />} />
        <Route path={ROUTES.bulletini} element={<Bulletini />} />
        <Route path={ROUTES.artikulli} element={<Artikulli />} />
        {Object.entries(LEGACY_PATHS).map(([from, to]) => (
          <Route key={from} path={from} element={<LegacyRedirect to={to} />} />
        ))}
        <Route path="*" element={<LegacyRedirect to={ROUTES.kreu} />} />
      </Routes>
    </>
  );
}
