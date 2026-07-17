const codigoTemaInicial = `
(() => {
  try {
    const temaGuardado = window.localStorage.getItem("theme");
    const prefiereOscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const usarOscuro = temaGuardado === "dark" || (!temaGuardado && prefiereOscuro);

    document.documentElement.classList.toggle("dark", usarOscuro);
  } catch {
    document.documentElement.classList.remove("dark");
  }
})();
`;

export default function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: codigoTemaInicial }}
    />
  );
}
