import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function EnvioMasivoEmails() {
  const [emails, setEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  // Función para manejar archivos adjuntos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  // Normaliza y valida la lista de emails
  const getEmailList = () => {
    return emails
      .split(/[,\s\n]+/)
      .map(email => email.trim())
      .filter(email => email.length > 0);
  };

  const handleSend = async () => {
    const emailList = getEmailList();
    if (emailList.length === 0) {
      toast.error('Debes ingresar al menos un correo electrónico válido.');
      return;
    }
    if (!subject.trim()) {
      toast.error('El asunto es obligatorio.');
      return;
    }
    if (!message.trim()) {
      toast.error('El mensaje es obligatorio.');
      return;
    }

    setSending(true);
    const formData = new FormData();
    formData.append('emails', emailList.join(','));
    formData.append('subject', subject);
    formData.append('message', message);
    attachments.forEach((file, idx) => {
      formData.append(`attachment${idx + 1}`, file);
    });

    try {
      const response = await fetch('/api/sendemail.php', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al enviar los correos');
      }
      toast.success('Correos enviados correctamente');
      setEmails('');
      setSubject('');
      setMessage('');
      setAttachments([]);
    } catch (error: any) {
      toast.error(error.message || 'Error al enviar los correos');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white p-8 rounded shadow">
      <h2 className="text-2xl font-bold mb-6">Envío Masivo de Correos</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Lista de correos</label>
        <textarea
          className="w-full border rounded p-2"
          rows={4}
          placeholder="Pega aquí los correos separados por coma, espacio o salto de línea"
          value={emails}
          onChange={e => setEmails(e.target.value)}
          disabled={sending}
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Asunto</label>
        <input
          className="w-full border rounded p-2"
          type="text"
          placeholder="Asunto del correo"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          disabled={sending}
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Mensaje</label>
        <textarea
          className="w-full border rounded p-2"
          rows={6}
          placeholder="Escribe el mensaje que deseas enviar"
          value={message}
          onChange={e => setMessage(e.target.value)}
          disabled={sending}
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Adjuntar archivos (opcional)</label>
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          disabled={sending}
        />
        {attachments.length > 0 && (
          <ul className="mt-2 text-xs text-gray-600">
            {attachments.map((file, idx) => (
              <li key={idx}>{file.name}</li>
            ))}
          </ul>
        )}
      </div>
      <button
        className="w-full bg-indigo-600 text-white py-2 rounded font-semibold hover:bg-indigo-700 disabled:bg-gray-400"
        onClick={handleSend}
        disabled={sending}
      >
        {sending ? 'Enviando...' : 'Enviar correos'}
      </button>
    </div>
  );
} 