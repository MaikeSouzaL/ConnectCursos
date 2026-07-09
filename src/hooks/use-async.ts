import { useEffect, useState } from 'react'

/** Executa uma Promise e expõe { data, loading, error }. Recarrega quando `deps` mudam. */
export function useAsync<T>(factory: () => Promise<T>, deps: React.DependencyList = []) {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>()

  useEffect(() => {
    let active = true
    setLoading(true)
    factory().then(
      (res) => {
        if (active) {
          setData(res)
          setLoading(false)
        }
      },
      (err) => {
        if (active) {
          setError(err)
          setLoading(false)
        }
      },
    )
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error }
}
