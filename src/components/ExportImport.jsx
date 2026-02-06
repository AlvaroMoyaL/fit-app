export default function ExportImport({ onExport, onImport }) {
  return (
    <div className="export-box">
      <h3>Exportar / Importar</h3>
      <p className="note">
        Puedes guardar tu progreso en un archivo y cargarlo luego.
      </p>
      <div className="export-actions">
        <button type="button" className="tiny primary-btn" onClick={onExport}>
          Exportar
        </button>
        <label className="tiny">
          Importar
          <input
            type="file"
            accept="application/json"
            onChange={onImport}
            style={{ display: "none" }}
          />
        </label>
      </div>
    </div>
  );
}
