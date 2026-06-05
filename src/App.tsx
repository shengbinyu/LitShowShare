import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider } from '@/i18n/LanguageContext'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import LiteratureDetail from '@/pages/LiteratureDetail'
import Import from '@/pages/Import'

/**
 * Root application component.
 * Uses nested route layout pattern where Layout renders <Outlet />
 * and child routes are rendered inside the Layout wrapper.
 */
export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/literature/:id" element={<LiteratureDetail />} />
            <Route path="/import" element={<Import />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  )
}
