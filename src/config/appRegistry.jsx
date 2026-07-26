import MultiLinkOpenerPage from '../apps/multi-link-opener/MultiLinkOpenerPage.jsx'
import JsonFormatterPage from '../apps/json-formatter/JsonFormatterPage.jsx'
import TextComparisonPage from '../apps/text-comparison/TextComparisonPage.jsx'
import MiniSitesDashboardPage from '../apps/mini-site-builder/MiniSitesDashboardPage.jsx'
import { MiniSiteIcon } from '../apps/mini-site-builder/icons.jsx'
import LinkIcon from '../components/icons/LinkIcon.jsx'
import {
  CompareIcon,
  JsonIcon,
  NotesIcon,
  TextIcon,
  TimerIcon,
} from '../components/icons/AppIcons.jsx'

export const appRegistry = [
  {
    id: 'multi-link-opener',
    title: 'Multi Link Opener',
    description:
      'Paste a stack of links and launch every destination in its own tab.',
    category: 'Browser workflow',
    status: 'available',
    path: '/multi-link-opener',
    icon: LinkIcon,
    accent: 'mint',
    requiresAuth: false,
    component: MultiLinkOpenerPage,
  },
  {
    id: 'json-formatter',
    title: 'JSON Formatter',
    description:
      'Repair invalid JSON, format it clearly, and copy a clean result.',
    category: 'Developer utility',
    status: 'available',
    path: '/json-formatter',
    icon: JsonIcon,
    accent: 'gold',
    requiresAuth: false,
    component: JsonFormatterPage,
  },
  {
    id: 'text-comparison',
    title: 'Text Comparison',
    description:
      'Compare prose or code and trace every addition and removal side by side.',
    category: 'Developer utility',
    status: 'available',
    path: '/text-comparison',
    icon: CompareIcon,
    accent: 'violet',
    requiresAuth: false,
    component: TextComparisonPage,
  },
  {
    id: 'mini-site-builder',
    title: 'Mini-Site Builder',
    description:
      'Shape and publish focused public pages for every part of your work.',
    category: 'Creator utility',
    status: 'available',
    path: '/mini-sites',
    icon: MiniSiteIcon,
    accent: 'mint',
    requiresAuth: true,
    component: MiniSitesDashboardPage,
  },
  {
    id: 'text-formatter',
    title: 'Text Formatter',
    description:
      'Clean, reshape, and prepare copied text for the next place it needs to go.',
    category: 'Writing utility',
    status: 'coming-soon',
    path: null,
    icon: TextIcon,
    accent: 'violet',
    requiresAuth: false,
    component: null,
  },
  {
    id: 'focus-timer',
    title: 'Focus Timer',
    description:
      'Set a clear work interval and keep the current task in view.',
    category: 'Focus utility',
    status: 'coming-soon',
    path: null,
    icon: TimerIcon,
    accent: 'violet',
    requiresAuth: false,
    component: null,
  },
  {
    id: 'quick-notes',
    title: 'Quick Notes',
    description:
      'Capture a thought quickly and keep it ready for the rest of your workflow.',
    category: 'Capture utility',
    status: 'coming-soon',
    path: null,
    icon: NotesIcon,
    accent: 'violet',
    requiresAuth: true,
    component: null,
  },
]

export function isRoutableApp(app) {
  return (
    app.status === 'available' &&
    typeof app.path === 'string' &&
    typeof app.component === 'function'
  )
}

export const availableApps = appRegistry.filter(isRoutableApp)
