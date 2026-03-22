export async function loadConfig(){
  const res = await fetch('/api/config', {cache:'no-store'})
  return res.json()
}
