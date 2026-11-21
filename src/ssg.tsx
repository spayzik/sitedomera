import { renderToString } from 'react-dom/server'
import App from './App'

export const renderShell = (props: Parameters<typeof App>[0]) => renderToString(<App {...props} />)
