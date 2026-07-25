import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { appRegistry } from './config/appRegistry.jsx'
import HomePage from './pages/HomePage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route index element={<HomePage />} />
        {appRegistry.map((app) => {
          const Page = app.component
          return <Route key={app.id} path={app.path} element={<Page />} />
        })}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  )
}
