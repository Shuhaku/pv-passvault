// src/renderer/src/App.tsx
import { useState, useEffect } from 'react'
import { hashMasterKey, encryptData, decryptData } from './utils/crypto'
import './assets/css/App.css'
import { Logo } from './components/Logo'

interface GridRow {
  id: number
  url: string
  userId: string
  userPw: string
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [masterKeyInput, setMasterKeyInput] = useState('')
  const [storedHash, setStoredHash] = useState<string | null>(null)

  const [rows, setRows] = useState<GridRow[]>([])
  const [isEditMode, setIsEditMode] = useState(false)

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [changeCurrentKey, setChangeCurrentKey] = useState('')
  const [changeNewKey, setChangeNewKey] = useState('')
  const [changeNewKeyConfirm, setChangeNewKeyConfirm] = useState('')

  useEffect(() => {
    const savedHash = localStorage.getItem('masterKeyHash')
    if (savedHash) setStoredHash(savedHash)
  }, [])

  const handleLogin = () => {
    if (!masterKeyInput) return
    const inputHash = hashMasterKey(masterKeyInput)

    if (!storedHash) {
      if (confirm('이 마스터키는 절대 찾을 수 없습니다. 등록하시겠습니까?')) {
        localStorage.setItem('masterKeyHash', inputHash)
        setStoredHash(inputHash)
        initializeGrid()
        setIsLoggedIn(true)
        setIsEditMode(true)
      }
      return
    }

    if (inputHash === storedHash) {
      loadAndDecryptData(masterKeyInput)
      setIsLoggedIn(true)
    } else {
      alert('마스터키가 일치하지 않습니다.')
      setMasterKeyInput('')
    }
  }

  const handleLock = () => {
    setIsLoggedIn(false)
    setMasterKeyInput('')
    setRows([])
    setIsEditMode(false)
  }

  const loadAndDecryptData = (key: string) => {
    const savedData = localStorage.getItem('vaultData')
    if (savedData) {
      try {
        const encryptedRows = JSON.parse(savedData)
        const decryptedRows = encryptedRows.map((row: any) => ({
          ...row,
          userPw: decryptData(row.userPw, key)
        }))
        setRows(decryptedRows)
      } catch (e) {
        initializeGrid()
      }
    } else {
      initializeGrid()
    }
  }

  const initializeGrid = () => {
    setRows(Array.from({ length: 1 }).map(() => createEmptyRow()))
  }
  const createEmptyRow = () => ({ id: Date.now() + Math.random(), url: '', userId: '', userPw: '' })

  // 공백(Trim) 및 유효성 검사 로직 적용
  const handleChange = (id: number, field: keyof GridRow, value: string) => {
    const trimmedValue = value.trim()
    if (/\s/.test(trimmedValue)) {
      alert('문자 사이에 공백을 포함할 수 없습니다. 🚫')
      return
    }
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: trimmedValue } : row)))
  }

  // ✨ [New] 행 삭제 기능
  const handleDeleteRow = (id: number) => {
    if (confirm('정말 이 줄을 삭제하시겠습니까?')) {
      setRows((prev) => prev.filter((row) => row.id !== id))
    }
  }

  const handleAddRow = () => {
    setRows((prev) => [...prev, ...Array.from({ length: 1 }).map(() => createEmptyRow())])
  }

  // [Updated] 저장 로직 + 유효성 검사
  const handleSave = () => {
    // 1. 아예 비어있는 줄은 무시 (저장 대상에서 제외)
    const nonEmptyRows = rows.filter(
      (row) => row.url.trim() !== '' || row.userId.trim() !== '' || row.userPw.trim() !== ''
    )

    // 2. 유효성 검사: 뭔가 적혀있는데, 3개 중 하나라도 비어있으면 경고
    const invalidRows = nonEmptyRows.filter(
      (row) => row.url.trim() === '' || row.userId.trim() === '' || row.userPw.trim() === ''
    )

    if (invalidRows.length > 0) {
      alert(
        '⚠️ 저장 실패!\n입력된 데이터 중 URL, ID, Password가 모두 채워지지 않은 항목이 있습니다.\n빈칸을 채우거나 해당 줄을 삭제해주세요.'
      )
      return // 저장 중단
    }

    // 3. 통과된 데이터만 암호화 저장
    const encryptedRows = nonEmptyRows.map((row) => ({
      ...row,
      userPw: encryptData(row.userPw, masterKeyInput)
    }))

    localStorage.setItem('vaultData', JSON.stringify(encryptedRows))

    // 4. 저장 후 데이터 갱신 (빈 줄 정리 등)하고 모드 전환
    setRows(
      nonEmptyRows.length > 0 ? nonEmptyRows : Array.from({ length: 1 }).map(() => createEmptyRow())
    )
    setIsEditMode(false)
    alert('안전하게 저장되었습니다! ✅')
  }

  // App.tsx 함수
  const handleChangeMasterKey = () => {
    // 1. 빈 값 체크 (3개 다 입력했는지)
    if (!changeCurrentKey || !changeNewKey || !changeNewKeyConfirm) {
      alert('모든 항목을 입력해주세요.')
      return
    }

    // 2. 현재 마스터키 인증
    if (hashMasterKey(changeCurrentKey) !== storedHash) {
      alert('현재 마스터키가 틀렸습니다.')
      return
    }

    // 3. 새로운 마스터키 검증
    if (changeNewKey !== changeNewKeyConfirm) {
      alert('새로운 마스터키가 일치하지 않습니다.\n다시 확인해주세요. 🚫')
      return
    }

    // ... (이 아래 데이터 재암호화 로직은 기존과 동일) ...
    const savedData = localStorage.getItem('vaultData')
    if (savedData) {
      try {
        const encryptedRows = JSON.parse(savedData)
        const reEncryptedRows = encryptedRows.map((row: any) => {
          const plainPw = decryptData(row.userPw, changeCurrentKey)
          return { ...row, userPw: encryptData(plainPw, changeNewKey) }
        })
        localStorage.setItem('vaultData', JSON.stringify(reEncryptedRows))
      } catch (e) {
        alert('오류 발생')
        return
      }
    }

    const newHash = hashMasterKey(changeNewKey)
    localStorage.setItem('masterKeyHash', newHash)
    setStoredHash(newHash)

    alert('마스터키 변경 완료! 🔑')

    // 초기화 (확인 변수도 같이 비워줌)
    setIsModalOpen(false)
    setChangeCurrentKey('')
    setChangeNewKey('')
    setChangeNewKeyConfirm('') // ✨ 추가
    setMasterKeyInput('')
  }

  const handleOpenModal = () => {
    // 1. 입력창 상태 초기화 (싹 비우기)
    setChangeCurrentKey('')
    setChangeNewKey('')
    setChangeNewKeyConfirm('')

    // 2. 모달 열기
    setIsModalOpen(true)
  }

  // --- 렌더링 ---
  if (!isLoggedIn) {
    return (
      <div className="app-container" style={{ justifyContent: 'center' }}>
        <div className="login-box">
          <Logo size={52} />
          <h1>Pass Vault</h1>
          <p className="subtitle">
            {storedHash ? '마스터키를 입력하세요.' : '새로운 마스터키 설정'}
          </p>
          <input
            type="password"
            className="login-input"
            placeholder="마스터키 입력"
            value={masterKeyInput}
            onChange={(e) => setMasterKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            autoFocus
          />
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleLogin}>
            {storedHash ? '잠금 해제' : '설정 완료'}
          </button>
          {storedHash && (
            <button className="link-button" onClick={handleOpenModal}>
              마스터키를 변경하고 싶으신가요?
            </button>
          )}
        </div>
        {isModalOpen && (
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>🔑 키 변경</h2>
              <p className="subtitle" style={{ marginBottom: '20px' }}>
                보안을 위해 현재 키를 확인합니다.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* 1. 현재 키 */}
                <input
                  type="password"
                  className="input-field"
                  placeholder="현재 마스터키"
                  value={changeCurrentKey}
                  onChange={(e) => setChangeCurrentKey(e.target.value)}
                />

                {/* 2. 새 키 (골드 테두리로 강조) */}
                <input
                  type="password"
                  className="input-field"
                  placeholder="새로운 마스터키"
                  value={changeNewKey}
                  onChange={(e) => setChangeNewKey(e.target.value)}
                />

                {/* 3. 새 키 확인 (✨ 추가된 부분) */}
                <input
                  type="password"
                  className="input-field"
                  placeholder="새로운 마스터키 (한 번 더)"
                  value={changeNewKeyConfirm}
                  onChange={(e) => setChangeNewKeyConfirm(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsModalOpen(false)}
                >
                  취소
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={handleChangeMasterKey}
                >
                  변경하기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo size={36} />
          <h2 style={{ marginBottom: 0 }}>My Vault</h2>
          <button className="lock-btn" onClick={handleLock} title="화면 잠그기 (로그아웃)">
            🔒
          </button>
        </div>
        <div className="btn-group">
          {!isEditMode ? (
            <button className="btn btn-secondary" onClick={() => setIsEditMode(true)}>
              ✏️ 수정하기
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={handleAddRow}>
                + 1줄
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                저장 완료
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid-container">
        <table className="grid-table">
          <thead>
            <tr>
              <th style={{ width: '30%' }}>URL</th>
              <th style={{ width: '30%' }}>ID</th>
              <th style={{ width: '35%' }}>PASSWORD</th>
              {/* 수정 모드일 때만 삭제 컬럼 헤더 표시 */}
              {isEditMode && <th style={{ width: '5%' }}></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <input
                    className={`grid-input ${isEditMode ? 'editable' : ''}`}
                    value={row.url}
                    placeholder={isEditMode ? 'site.com' : ''}
                    readOnly={!isEditMode}
                    onChange={(e) => handleChange(row.id, 'url', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className={`grid-input ${isEditMode ? 'editable' : ''}`}
                    value={row.userId}
                    placeholder={isEditMode ? 'username' : ''}
                    readOnly={!isEditMode}
                    onChange={(e) => handleChange(row.id, 'userId', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="password"
                    className={`grid-input ${isEditMode ? 'editable' : ''}`}
                    value={row.userPw}
                    placeholder={isEditMode ? '••••••' : ''}
                    readOnly={!isEditMode}
                    onChange={(e) => handleChange(row.id, 'userPw', e.target.value)}
                    onFocus={(e) => (e.target.type = 'text')}
                    onBlur={(e) => (e.target.type = 'password')}
                  />
                </td>

                {/* ✨ 수정 모드일 때만 삭제 버튼 표시 */}
                {isEditMode && (
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteRow(row.id)}
                        title="삭제"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default App
