export default function MetricsPanel({ metrics, onInfo }) {
  return (
    <div className="metrics">
      <div className="metrics-head">
        <div>
          <p className="section-eyebrow">Snapshot físico</p>
          <h2>Métricas calculadas</h2>
          <p className="note">Resumen automático a partir de tu perfil y medidas actuales.</p>
        </div>
        <button type="button" className="link" onClick={onInfo}>
          ¿Qué significan estas métricas?
        </button>
      </div>
      <div className="metrics-grid">
        <div>
          <span>IMC</span>
          <strong>{metrics.bmi.toFixed(1)}</strong>
        </div>
        <div>
          <span>Categoría IMC</span>
          <strong>{metrics.bmiCat}</strong>
        </div>
        <div>
          <span>TMB (BMR)</span>
          <strong>{Math.round(metrics.bmr)} kcal</strong>
        </div>
        <div>
          <span>TDEE</span>
          <strong>{Math.round(metrics.tdee)} kcal</strong>
        </div>
        <div>
          <span>WHtR</span>
          <strong>{metrics.whtr.toFixed(2)}</strong>
        </div>
        <div>
          <span>WHR</span>
          <strong>{metrics.whr.toFixed(2)}</strong>
        </div>
        <div>
          <span>% Grasa</span>
          <strong>
            {metrics.bodyFat ? metrics.bodyFat.toFixed(1) + "%" : "—"}
          </strong>
        </div>
        <div>
          <span>Masa magra</span>
          <strong>
            {metrics.leanMass ? metrics.leanMass.toFixed(1) + " kg" : "—"}
          </strong>
        </div>
        <div>
          <span>FFMI</span>
          <strong>{metrics.ffmi ? metrics.ffmi.toFixed(1) : "—"}</strong>
        </div>
      </div>
      <p className="note">
        * Las métricas son aproximadas y no sustituyen consejo médico.
      </p>
    </div>
  );
}
