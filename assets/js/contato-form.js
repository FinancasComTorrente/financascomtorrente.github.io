// Envio do formulário de qualificação (SDR) por e-mail (via FormSubmit.co)
document.addEventListener('DOMContentLoaded', function () {
    var forms = document.querySelectorAll('.contato-form');
    if (!forms.length) return;

    var endpoint = 'https://formsubmit.co/ajax/financascomtorrente@gmail.com';

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

            if (phoneInput) {
                var rawDigits = phoneInput.value.replace(/\D/g, '');
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

            var data = new FormData(form);

            // Converte selects para o rótulo legível no e-mail
            ['momento_financeiro', 'principal_desafio', 'assunto'].forEach(function (fieldName) {
                var selectEl = form.querySelector('[name="' + fieldName + '"]');
                if (selectEl && selectEl.tagName === 'SELECT' && selectEl.selectedIndex >= 0) {
                    data.set(fieldName, selectEl.options[selectEl.selectedIndex].text);
                }
            });

            fetch(endpoint, {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: data
            })
                .then(function (res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.json();
                })
                .then(function () {
                    form.reset();
                    setStatus('Recebemos seus dados! Nossa equipe entrará em contato em breve.', 'success');
                    if (typeof fbq === 'function') fbq('track', 'Lead');
                })
                .catch(function () {
                    setStatus('Não foi possível enviar agora. Tente novamente ou fale conosco pelo WhatsApp.', 'error');
                })
                .finally(function () {
                    button.disabled = false;
                    button.innerHTML = originalHTML;
                });
        });
    });
});
