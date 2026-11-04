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

        // Sugestões rápidas clicáveis (chips) que preenchem o campo digitável
        var chips = form.querySelectorAll('.quick-chip');
        chips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                var group = chip.closest('.form-group');
                if (!group) return;
                var input = group.querySelector('input[type="text"], textarea');
                if (!input) return;

                var value = chip.getAttribute('data-value') || chip.textContent.trim();
                input.value = value;

                group.querySelectorAll('.quick-chip').forEach(function (c) {
                    c.classList.remove('active');
                });
                chip.classList.add('active');
                input.focus();
            });
        });

        // Se o usuário digitar manualmente, sincroniza o destaque das sugestões
        ['momento_financeiro', 'principal_desafio'].forEach(function (fieldName) {
            var field = form.querySelector('[name="' + fieldName + '"]');
            if (field) {
                field.addEventListener('input', function () {
                    var group = field.closest('.form-group');
                    if (!group) return;
                    var currentVal = field.value.trim();
                    group.querySelectorAll('.quick-chip').forEach(function (c) {
                        var chipVal = c.getAttribute('data-value') || c.textContent.trim();
                        if (chipVal === currentVal) {
                            c.classList.add('active');
                        } else {
                            c.classList.remove('active');
                        }
                    });
                });
            }
        });

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

            var lgpdInput = form.querySelector('input[name="aceite_lgpd"]');
            if (lgpdInput && !lgpdInput.checked) {
                setStatus('Por favor, marque a caixa de concordância com a LGPD para enviar.', 'error');
                lgpdInput.focus();
                return;
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
                aceite_lgpd: 'Sim (Aceito LGPD)',
                pagina_origem: formData.get('pagina_origem') || (document.title + ' (' + window.location.pathname + ')')
            };

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
                    form.querySelectorAll('.quick-chip.active').forEach(function (c) {
                        c.classList.remove('active');
                    });
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
