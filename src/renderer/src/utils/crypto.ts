import CryptoJS from 'crypto-js'

// 1. 마스터키 단방향 암호화 (저장용/검증용) - SHA256 사용
export const hashMasterKey = (key: string): string => {
  return CryptoJS.SHA256(key).toString()
}

// 2. 데이터 양방향 암호화 (마스터키를 이용해 잠금)
export const encryptData = (data: string, masterKey: string): string => {
  return CryptoJS.AES.encrypt(data, masterKey).toString()
}

// 3. 데이터 복호화 (마스터키를 이용해 열기)
export const decryptData = (encryptedData: string, masterKey: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, masterKey)
    return bytes.toString(CryptoJS.enc.Utf8)
  } catch (e) {
    return '' // 키가 틀리면 빈 값 반환
  }
}
