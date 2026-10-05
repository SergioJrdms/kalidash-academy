import { useState } from 'react'
import type { LessonQuiz } from '../types/db'
import { Icon, Kicker } from './ui'
import { NAV_ICON } from '../lib/icons'
import { track } from '../lib/analytics'

/**
 * Verificação de conhecimento da aula.
 * Uma pergunta por vez; a resposta só é revelada depois de verificar.
 */
export default function QuizCard({
  quizzes,
  lessonId,
  courseId,
}: {
  quizzes: LessonQuiz[]
  lessonId: string
  courseId: string | null
}) {
  const [indice, setIndice] = useState(0)
  const [escolha, setEscolha] = useState<number | null>(null)
  const [verificado, setVerificado] = useState(false)

  if (quizzes.length === 0) return null

  const q = quizzes[indice]
  const opcoes = Array.isArray(q.options) ? q.options : []
  const acertou = escolha === q.correct_index

  function verificar() {
    if (escolha == null) return
    setVerificado(true)
    track('quiz_answered', {
      lesson_id: lessonId,
      course_id: courseId,
      acertou: escolha === q.correct_index,
      pergunta: q.question,
    })
  }

  function proxima() {
    setIndice((i) => i + 1)
    setEscolha(null)
    setVerificado(false)
  }

  return (
    <section className="k-card" style={{ padding: 22 }}>
      <Kicker style={{ marginBottom: 14 }}>Verificação de conhecimento</Kicker>

      <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.45, marginBottom: 18 }}>
        {q.question}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
        {opcoes.map((o, i) => {
          const marcada = escolha === i
          const certa = verificado && i === q.correct_index
          const errada = verificado && marcada && i !== q.correct_index

          return (
            <button
              key={i}
              onClick={() => !verificado && setEscolha(i)}
              disabled={verificado}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
                background: certa ? 'var(--oksoft)' : errada ? 'var(--dangersoft)' : 'var(--surface)',
                border: `1px solid ${
                  certa
                    ? 'var(--ok)'
                    : errada
                      ? 'var(--danger)'
                      : marcada
                        ? 'var(--imperial)'
                        : 'var(--line2)'
                }`,
                borderRadius: 'var(--r-control)',
                padding: '12px 14px',
                fontSize: 14,
                color: 'var(--tx)',
                cursor: verificado ? 'default' : 'pointer',
                transition: 'border-color .15s, background .15s',
              }}
            >
              <span
                style={{
                  flex: 'none',
                  width: 17,
                  height: 17,
                  borderRadius: '50%',
                  border: `1.5px solid ${
                    certa ? 'var(--ok)' : errada ? 'var(--danger)' : marcada ? 'var(--imperial)' : 'var(--line2)'
                  }`,
                  background: marcada && !verificado ? 'var(--imperial)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {certa && <Icon d={NAV_ICON.check} size={10} stroke="var(--ok)" width={3} />}
                {errada && <Icon d={NAV_ICON.close} size={9} stroke="var(--danger)" width={3} />}
              </span>
              {o}
            </button>
          )
        })}
      </div>

      {verificado && q.explanation && (
        <div
          style={{
            background: acertou ? 'var(--oksoft)' : 'var(--surface2)',
            border: `1px solid ${acertou ? 'var(--ok)' : 'var(--line)'}`,
            borderRadius: 'var(--r-control)',
            padding: '12px 14px',
            fontSize: 13.5,
            lineHeight: 1.55,
            color: 'var(--tx)',
            marginBottom: 16,
          }}
        >
          <strong style={{ display: 'block', marginBottom: 4, color: acertou ? 'var(--ok)' : 'var(--tx)' }}>
            {acertou ? 'Isso mesmo.' : 'Não é essa.'}
          </strong>
          {q.explanation}
        </div>
      )}

      {!verificado ? (
        <button
          onClick={verificar}
          disabled={escolha == null}
          style={{
            width: '100%',
            background: escolha == null ? 'var(--line)' : 'var(--imperial)',
            color: escolha == null ? 'var(--tx3)' : 'var(--bg)',
            border: 'none',
            borderRadius: 'var(--r-control)',
            padding: '12px 0',
            fontSize: 14,
            fontWeight: 600,
            cursor: escolha == null ? 'not-allowed' : 'pointer',
          }}
        >
          Verificar resposta →
        </button>
      ) : indice < quizzes.length - 1 ? (
        <button
          onClick={proxima}
          style={{
            width: '100%',
            background: 'var(--imperial)',
            color: 'var(--bg)',
            border: 'none',
            borderRadius: 'var(--r-control)',
            padding: '12px 0',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Próxima pergunta →
        </button>
      ) : null}
    </section>
  )
}
