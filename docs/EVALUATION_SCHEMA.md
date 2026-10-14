# Contrato de evaluación

El importador acepta un objeto individual o `{ "evaluations": [...] }`. El puntaje general no se incluye: lo calcula el proyecto con los pesos guardados en SQLite.

```json
{
  "evaluations": [
    {
      "jobId": "UUID",
      "method": "codex_cli",
      "evaluator": "Codex CLI",
      "assessmentStatus": "scored",
      "dimensions": {
        "professionalAlignment": { "score": 85, "evidence": "Evidencia concreta de la descripción." },
        "learningPotential": { "score": 80, "evidence": "Evidencia concreta de la descripción." },
        "experienceCompatibility": { "score": 75, "evidence": "Evidencia concreta del perfil y requisitos." },
        "conditionsAndDuration": { "score": 60, "evidence": "Ubicación, modalidad y duración informadas." },
        "careerProjection": { "score": 75, "evidence": "Responsabilidades y proyección observables." }
      },
      "eligibility": "likely",
      "professionalCategory": "Growth",
      "strengths": ["Fortaleza respaldada por la oferta"],
      "weaknesses": ["Debilidad o riesgo concreto"],
      "missingRequirements": [],
      "learningPotential": "Descripción específica de qué podría aprender.",
      "justification": "Resumen razonado que distingue interés profesional de elegibilidad.",
      "recommendation": "apply",
      "confidence": 0.78,
      "unknowns": ["Duración exacta no publicada"]
    }
  ]
}
```

Si la información es insuficiente, usa `assessmentStatus: "insufficient"`, las cinco puntuaciones en `null`, recomendación `review` y enumera los datos faltantes.

## Rúbrica común para cada dimensión

- 90–100: evidencia directa y fuerte de un encaje excepcional.
- 75–89: buen encaje con brechas menores.
- 60–74: encaje parcial; requiere validar condiciones o habilidades.
- 40–59: señales débiles o varias brechas importantes.
- 0–39: incompatibilidad explícita o ausencia clara del criterio.

Cada puntuación necesita evidencia específica. No subas una nota por intuición general ni por prestigio de marca.

## Pesos iniciales

| Dimensión | Peso |
| --- | ---: |
| Alineación profesional | 30% |
| Aprendizaje potencial | 25% |
| Compatibilidad con experiencia | 20% |
| Condiciones y duración | 15% |
| Proyección profesional | 10% |
