import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useSeasons() {
  const [seasons, setSeasons] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSeasons = useCallback(async () => {
    const { data } = await supabase
      .from('seasons')
      .select('*')
      .order('ended_at', { ascending: false })
    if (data) setSeasons(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchSeasons() }, [fetchSeasons])

  const addSeason = useCallback(async ({ championName, startedAt, endedAt }) => {
    const { error } = await supabase.from('seasons').insert({
      champion_name: championName,
      started_at: startedAt,
      ended_at: endedAt,
    })
    if (!error) await fetchSeasons()
    return error
  }, [fetchSeasons])

  // Most recent season champion (null if no seasons yet)
  const currentChampion = seasons[0]?.champion_name ?? null

  // Current season begins after the most recent season ended
  const currentSeasonStart = seasons[0] ? new Date(seasons[0].ended_at) : null

  return { seasons, loading, addSeason, currentChampion, currentSeasonStart }
}
