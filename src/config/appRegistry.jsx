import MultiLinkOpenerPage from '../apps/multi-link-opener/MultiLinkOpenerPage.jsx'
import LinkIcon from '../components/icons/LinkIcon.jsx'

export const appRegistry = [
  {
    id: 'multi-link-opener',
    title: 'Multi Link Opener',
    description:
      'Paste a stack of links and launch every destination in its own tab.',
    path: '/multi-link-opener',
    icon: LinkIcon,
    accent: 'violet',
    component: MultiLinkOpenerPage,
  },
]
