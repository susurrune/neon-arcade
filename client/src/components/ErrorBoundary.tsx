import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cyber-bg flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="font-pixel text-sm neon-text-pink mb-4">SYSTEM ERROR</h1>
            <p className="font-mono text-xs text-gray-500 mb-6">
              {this.state.error?.message || '未知错误'}
            </p>
            <button
              className="neon-btn-blue"
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/'
              }}
            >
              重启系统
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
