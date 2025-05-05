import { useState, useEffect } from 'react'

export function useCustomerSearch(allCustomers, query) {
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    if (query.trim() === '') {
      setSuggestions([])
      return
    }
    const queryLower = query.toLowerCase()
    const filtered = allCustomers.filter(c =>
      c.displayName?.toLowerCase().includes(queryLower)
    )
    setSuggestions(filtered)
  }, [query, allCustomers])

  return suggestions
}
