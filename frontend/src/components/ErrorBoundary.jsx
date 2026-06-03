import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Hook for an error-tracking service (Sentry, etc.) later.
    console.error('Unhandled UI error:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false })
    window.location.assign('/')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 text-center">
          <div className="text-4xl mb-4">😕</div>
          <h1 className="font-serif text-2xl font-light text-ink mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-muted mb-6 max-w-sm">
            The page hit an unexpected error. Reloading usually fixes it.
          </p>
          <button
            onClick={this.handleReload}
            className="text-sm font-medium bg-ink text-paper rounded-xl px-5 py-2.5 hover:bg-ink/90 transition-colors"
          >
            Reload ByMe
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
