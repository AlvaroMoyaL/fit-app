export default function MetricsInfoModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Cómo se obtienen las métricas</h3>
        <ul>
          <li>
            <strong>Peso (kg):</strong> con báscula. Ideal en la mañana, después
            de ir al baño y sin ropa pesada.
          </li>
          <li>
            <strong>Altura (cm):</strong> descalzo, espalda recta, usando
            cinta métrica o tallímetro.
          </li>
          <li>
            <strong>Cintura (cm):</strong> cinta métrica a la altura del
            ombligo o justo sobre el hueso de la cadera, sin apretar.
          </li>
          <li>
            <strong>Cadera (cm):</strong> parte más ancha de los glúteos.
          </li>
          <li>
            <strong>Cuello (cm):</strong> debajo de la nuez. Útil para % grasa.
          </li>
          <li>
            <strong>% Grasa:</strong> ideal con báscula de bioimpedancia (BIA)
            o fórmula US Navy (cintura + cuello; y cadera en mujeres).
          </li>
        </ul>

        <div className="measure-grid">
          <div className="measure-card">
            <svg viewBox="0 0 120 160" aria-hidden="true">
              <rect x="48" y="20" width="24" height="80" rx="10" />
              <rect x="42" y="92" width="36" height="52" rx="10" />
              <line x1="20" y1="62" x2="100" y2="62" />
            </svg>
            <strong>Cintura</strong>
            <span>Altura del ombligo</span>
          </div>
          <div className="measure-card">
            <svg viewBox="0 0 120 160" aria-hidden="true">
              <rect x="48" y="20" width="24" height="80" rx="10" />
              <rect x="38" y="92" width="44" height="52" rx="12" />
              <line x1="18" y1="112" x2="102" y2="112" />
            </svg>
            <strong>Cadera</strong>
            <span>Zona más ancha</span>
          </div>
          <div className="measure-card">
            <svg viewBox="0 0 120 160" aria-hidden="true">
              <rect x="48" y="20" width="24" height="80" rx="10" />
              <circle cx="60" cy="16" r="10" />
              <line x1="28" y1="28" x2="92" y2="28" />
            </svg>
            <strong>Cuello</strong>
            <span>Debajo de la nuez</span>
          </div>
        </div>

        <h3>Qué significan</h3>
        <ul>
          <li><strong>IMC:</strong> relación peso/altura. Útil como referencia general.</li>
          <li><strong>Categoría IMC:</strong> rango estimado (bajo peso, normal, etc.).</li>
          <li><strong>TMB (BMR):</strong> calorías mínimas en reposo.</li>
          <li><strong>TDEE:</strong> calorías estimadas según actividad.</li>
          <li><strong>WHtR:</strong> cintura/altura. Riesgo metabólico si es alto.</li>
          <li><strong>WHR:</strong> cintura/cadera. Distribución de grasa.</li>
          <li><strong>% Grasa:</strong> estimación de grasa corporal.</li>
          <li><strong>Masa magra:</strong> peso sin grasa (músculo, hueso, agua).</li>
          <li><strong>FFMI:</strong> masa magra ajustada por altura.</li>
        </ul>

        <h3>Otras estadísticas interesantes</h3>
        <ul>
          <li><strong>Frecuencia cardiaca en reposo:</strong> al despertar.</li>
          <li><strong>Horas de sueño:</strong> calidad y consistencia.</li>
          <li><strong>Pasos diarios:</strong> indicador simple de actividad.</li>
          <li><strong>PRs de fuerza:</strong> mejores repeticiones/peso.</li>
          <li><strong>Volumen semanal:</strong> total de series o repeticiones.</li>
          <li><strong>VO₂ máx estimado:</strong> si usas smartwatch.</li>
        </ul>
        <button className="primary" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
