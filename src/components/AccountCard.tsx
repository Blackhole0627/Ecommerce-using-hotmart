import { useState } from 'react'
import { useT } from '../i18n'
import type { Account } from '../lib/session'
import type { SyncStatus } from '../lib/sync'
import './AccountCard.css'

/**
 * "Sua conta", no topo de Ajustes: quem esta logada, se o progresso esta
 * salvo, e as duas saidas (sair deste celular, ou excluir a conta).
 *
 * Excluir pede confirmacao na propria pagina, sem janela do sistema: o
 * confirm() do navegador some atras do app instalado em alguns Android.
 */
interface Props {
  user: Account
  sync: SyncStatus
  onRename: (name: string) => Promise<boolean>
  onSignOut: () => void
  onDelete: () => Promise<boolean>
}

export function AccountCard({ user, sync, onRename, onSignOut, onDelete }: Props) {
  const t = useT()
  const [name, setName] = useState(user.name)
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'failed'>('idle')
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteFailed, setDeleteFailed] = useState(false)

  const initial = (user.name || user.email).trim().charAt(0).toUpperCase()
  const dirty = name.trim() !== user.name

  const save = async () => {
    if (!dirty || saving) return
    setSaving(true)
    const ok = await onRename(name.trim())
    setSaving(false)
    setSaveState(ok ? 'saved' : 'failed')
  }

  const remove = async () => {
    setDeleting(true)
    setDeleteFailed(false)
    const ok = await onDelete()
    // Deu certo: a pagina recarrega e esta tela some. So chega aqui se falhou.
    if (!ok) {
      setDeleting(false)
      setDeleteFailed(true)
    }
  }

  const syncText =
    sync === 'pending' ? t.account.pending : sync === 'syncing' ? t.account.syncing : t.account.synced

  return (
    <section className="card settings__group account" aria-label={t.account.title}>
      <h2 className="settings__group-title">{t.account.title}</h2>

      <div className="account__who">
        {user.photo ? (
          <img
            className="account__avatar"
            src={user.photo}
            alt=""
            width={52}
            height={52}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="account__avatar account__avatar--initial" aria-hidden="true">
            {initial}
          </span>
        )}
        <div className="account__ids">
          {user.name && <strong className="account__name">{user.name}</strong>}
          <span className="account__email">{user.email}</span>
        </div>
      </div>

      <p className={`account__sync account__sync--${sync}`} role="status">
        {syncText}
      </p>

      <label className="account__label" htmlFor="account-name">
        {t.account.nameLabel}
      </label>
      <div className="account__rename">
        <input
          id="account-name"
          className="account__input"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setSaveState('idle')
          }}
          placeholder={t.account.namePlaceholder}
          maxLength={60}
          autoComplete="given-name"
          enterKeyHint="done"
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save()
          }}
        />
        <button className="btn btn--ghost account__save" onClick={() => void save()} disabled={!dirty || saving}>
          {saveState === 'saved' && !dirty ? t.account.saved : t.account.save}
        </button>
      </div>
      {saveState === 'failed' && (
        <p className="account__error" role="alert">
          {t.account.saveFailed}
        </p>
      )}

      <div className="account__actions">
        <button className="btn btn--ghost" onClick={onSignOut}>
          {t.account.signOut}
        </button>
        <p className="settings__group-hint">{t.account.signOutHint}</p>

        {confirming ? (
          <div className="settings__confirm">
            <p>{t.account.deleteConfirm}</p>
            <div className="settings__confirm-actions">
              <button className="btn btn--primary account__danger" onClick={() => void remove()} disabled={deleting}>
                {t.account.deleteYes}
              </button>
              <button className="btn btn--quiet" onClick={() => setConfirming(false)} disabled={deleting}>
                {t.account.cancel}
              </button>
            </div>
            {deleteFailed && (
              <p className="account__error" role="alert">
                {t.account.deleteFailed}
              </p>
            )}
          </div>
        ) : (
          <>
            <button className="btn btn--quiet account__delete" onClick={() => setConfirming(true)}>
              {t.account.deleteTitle}
            </button>
            <p className="settings__group-hint">{t.account.deleteHint}</p>
          </>
        )}
      </div>
    </section>
  )
}
