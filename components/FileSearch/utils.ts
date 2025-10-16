import {
  FileIcon,
  FileCode,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  FileAudio,
  Archive,
} from "lucide-react"

export const FILE_STYLES = {
  doc: { icon: FileCode, iconColor: "text-blue-500", bgColor: "from-blue-500/20 to-blue-600/20 border-blue-500/30" },
  xls: { icon: FileSpreadsheet, iconColor: "text-green-500", bgColor: "from-green-500/20 to-green-600/20 border-green-500/30" },
  img: { icon: FileImage, iconColor: "text-purple-500", bgColor: "from-purple-500/20 to-purple-600/20 border-purple-500/30" },
  vid: { icon: FileVideo, iconColor: "text-pink-500", bgColor: "from-pink-500/20 to-pink-600/20 border-pink-500/30" },
  aud: { icon: FileAudio, iconColor: "text-yellow-500", bgColor: "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30" },
  zip: { icon: Archive, iconColor: "text-gray-500", bgColor: "from-gray-500/20 to-gray-600/20 border-gray-500/30" },
  def: { icon: FileIcon, iconColor: "text-slate-500", bgColor: "from-slate-500/20 to-slate-600/20 border-slate-500/30" },
}

export const getFileStyle = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase()
  const map: Record<string, keyof typeof FILE_STYLES> = {
    doc: 'doc', docx: 'doc',
    xls: 'xls', xlsx: 'xls', csv: 'xls',
    jpg: 'img', jpeg: 'img', png: 'img', gif: 'img', webp: 'img',
    mp4: 'vid', avi: 'vid', mov: 'vid', wmv: 'vid',
    mp3: 'aud', wav: 'aud', flac: 'aud',
    zip: 'zip', rar: 'zip', '7z': 'zip',
  }
  return FILE_STYLES[map[ext || ''] || 'def']
}

export const getFileTypeColor = (fileName: string) => getFileStyle(fileName).bgColor

export const isImage = (fileName: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)

export const MEDIA_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  mp4: 'video/mp4', mp3: 'audio/mpeg', wav: 'audio/wav',
  zip: 'application/zip', rar: 'application/x-rar-compressed',
}

export const getMediaType = (fileName: string) => 
  MEDIA_TYPES[fileName.split('.').pop()?.toLowerCase() || ''] || 'application/octet-stream'

export const verifyFileExists = async (s3Url: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/files/presigned-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ s3Url }),
    })
    return response.ok && !!(await response.json()).presignedUrl
  } catch {
    return false
  }
}