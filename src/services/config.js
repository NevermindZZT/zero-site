export async function loadConfig(){
  const res = await fetch('/js/config.json', {cache:'no-store'})
  return res.json()
}
