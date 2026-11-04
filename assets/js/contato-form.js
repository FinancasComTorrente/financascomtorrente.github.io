// Envio do formulário de qualificação (SDR) via Google Apps Script (Gmail + Google Sheets / 3C)
document.addEventListener('DOMContentLoaded', function () {
    var forms = document.querySelectorAll('.contato-form');
    if (!forms.length) return;

    // URL do Web App gerado no Google Apps Script
    var GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwNiX6ousamYRgwmVwRsdk5ZUeS8Oy3h6mA1miKVII7rsHRd1wCkLAWGGvK6-dB8Ayq/exec';

    // Máscara automática para Telefone / WhatsApp brasileiro: (DD) 9XXXX-XXXX
    function formatPhone(value) {
        var digits = value.replace(/\D/g, '').slice(0, 11);
        if (!digits.length) return '';
        if (digits.length <= 2) return '(' + digits;
        if (digits.length <= 6) return '(' + digits.slice(0, 2) + ') ' + digits.slice(2);
        if (digits.length <= 10) {
            return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 6) + '-' + digits.slice(6);
        }
        return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7);
    }

    forms.forEach(function (form) {
        var phoneInput = form.querySelector('input[name="telefone"]');
        if (phoneInput) {
            phoneInput.addEventListener('input', function (e) {
                e.target.value = formatPhone(e.target.value);
            });
        }

        var originInput = form.querySelector('input[name="pagina_origem"]');
        if (originInput && !originInput.value) {
            originInput.value = document.title + ' (' + (window.location.pathname || '/') + ')';
        }

        var status = form.querySelector('.form-status');
        var button = form.querySelector('button[type="submit"]');

        function setStatus(message, type) {
            if (!status) return;
            status.textContent = message;
            status.className = 'form-status ' + type;
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            // Anti-spam honeypot
            var honey = form.querySelector('input[name="_honey"]');
            if (honey && honey.value) return;

            var rawDigits = '';
            if (phoneInput) {
                rawDigits = phoneInput.value.replace(/\D/g, '');
                if (rawDigits.length < 10) {
                    setStatus('Por favor, informe um número de telefone/WhatsApp válido com DDD.', 'error');
                    phoneInput.focus();
                    return;
                }
            }

            var originalHTML = button.innerHTML;
            button.disabled = true;
            button.textContent = 'Enviando...';
            setStatus('', '');

            var formData = new FormData(form);
            var payload = {
                data_hora: new Date().toLocaleString('pt-BR'),
                nome: formData.get('nome') || '',
                telefone: formData.get('telefone') || '',
                telefone_3c: rawDigits ? ('55' + rawDigits) : '',
                email: formData.get('email') || '',
                momento_financeiro: formData.get('momento_financeiro') || '',
                principal_desafio: formData.get('principal_desafio') || '',
                mensagem: formData.get('mensagem') || '',
                pagina_origem: formData.get('pagina_origem') || (document.title + ' (' + window.location.pathname + ')')
            };

            // Converte selects para o rótulo legível na planilha e no e-mail
            ['momento_financeiro', 'principal_desafio'].forEach(function (fieldName) {
                var selectEl = form.querySelector('[name="' + fieldName + '"]');
                if (selectEl && selectEl.tagName === 'SELECT' && selectEl.selectedIndex >= 0) {
                    payload[fieldName] = selectEl.options[selectEl.selectedIndex].text;
                }
            });

            fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(payload)
            })
                .then(function (res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.json();
                })
                .then(function (result) {
                    if (result && result.result === 'error') {
                        throw new Error(result.message || 'Erro no Google Apps Script');
                    }
                    form.reset();
                    setStatus('Recebemos seus dados! Nossa equipe entrará em contato em breve.', 'success');
                    if (typeof fbq === 'function') fbq('track', 'Lead');
                })
                .catch(function (err) {
                    console.error('Erro ao enviar formulário:', err);
                    setStatus('Não foi possível enviar agora. Tente novamente ou fale conosco pelo WhatsApp.', 'error');
                })
                .finally(function () {
                    button.disabled = false;
                    button.innerHTML = originalHTML;
                });
        });
    });
});
