import { useState, type CSSProperties } from 'react'
import { Icon } from './ui'
import { NAV_ICON } from '../lib/icons'

/**
 * Imagem de conteúdo.
 *
 * Três coisas que o `background-image` não dava:
 *
 * 1. `loading="lazy"` — o navegador só busca o arquivo quando ele chega
 *    perto da janela. Numa lista de vinte cartões, isso é a diferença
 *    entre vinte downloads e três.
 * 2. Aparecer com calma quando o arquivo chega, em vez de piscar.
 * 3. Cair no lugar certo quando não há imagem ou o arquivo falha — o
 *    roxo da marca com a marca d'água, nunca um retângulo quebrado.
 */
export function Imagem({
  src,
  alt = '',
  altura,
  largura,
  raio = 12,
  icone = NAV_ICON.spark,
  tamanhoIcone,
  style,
  children,
}: {
  src?: string | null
  alt?: string
  altura: number | string
  largura?: number | string
  raio?: number
  /** Traço mostrado quando não há imagem. */
  icone?: string
  tamanhoIcone?: number
  style?: CSSProperties
  /** Selos e sobreposições, posicionados em relação à moldura. */
  children?: React.ReactNode
}) {
  const [pronta, setPronta] = useState(false)
  const [falhou, setFalhou] = useState(false)

  const mostraImagem = Boolean(src) && !falhou
  const lado =
    tamanhoIcone ?? Math.max(18, Math.min(54, typeof altura === 'number' ? altura * 0.3 : 28))

  return (
    <div
      style={{
        position: 'relative',
        flex: 'none',
        width: largura ?? '100%',
        height: altura,
        borderRadius: raio,
        overflow: 'hidden',
        background: 'linear-gradient(142deg,#2f1f44 0%,#28183b 45%,#1a1026 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {/* A marca d'água fica atrás: enquanto a foto não chega, é ela que
          se vê, e não um vazio. */}
      <Icon d={icone} size={lado} stroke="var(--champagne)" width={1.1} style={{ opacity: 0.45 }} />

      {mostraImagem && (
        <img
          src={src!}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setPronta(true)}
          onError={() => setFalhou(true)}
          className={`k-img${pronta ? ' is-pronta' : ''}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}

      {children}
    </div>
  )
}

/**
 * A foto de uma pessoa, por cima de um avatar que já existe.
 *
 * Avatar de gente é diferente de arte de conteúdo: o lugar nunca está
 * vazio, já tem o círculo colorido com as iniciais. Então a foto não
 * substitui nada — ela entra por cima, com calma, e se o arquivo não
 * vier as iniciais continuam ali.
 *
 * Quem usa precisa dar ao círculo `position: relative` e
 * `overflow: hidden`.
 */
export function FotoSobreposta({ src, alt = '' }: { src?: string | null; alt?: string }) {
  const [pronta, setPronta] = useState(false)
  const [falhou, setFalhou] = useState(false)

  if (!src || falhou) return null

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setPronta(true)}
      onError={() => setFalhou(true)}
      className={`k-img${pronta ? ' is-pronta' : ''}`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
    />
  )
}
