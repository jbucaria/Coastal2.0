 const getGeocoding = async address => {
  const apiKey = 'AIzaSyCaaprXbVDmKz6W5rn3s6W4HhF4S1K2-zs' // Replace with your Google Maps API key
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK') {
      const { lat, lng } = data.results[0].geometry.location
      return { lat, lng }
    } else {
      throw new Error('Unable to get coordinates for this address')
    }
  } catch (error) {
    console.error(error)
    return null
  }
}

export { getGeocoding }