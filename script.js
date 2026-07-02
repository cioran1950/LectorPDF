(function() {
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }

    let pdfDoc = null,
        pageNum = 1,
        pageIsRendering = false,
        pageNumPending = null;

    const scale = 1.5;
    const DIAS_NOTIFICACION = 3; // Días que durará el indicador "Nuevo"

    window.addEventListener('DOMContentLoaded', () => {
        const canvas = document.getElementById('pdf-render');
        const ctx = canvas ? canvas.getContext('2d') : null;

        // Validar si la imagen de portada falla en su ruta
        const welcomeImg = document.querySelector('.onerror-fallback');
        if (welcomeImg) {
            welcomeImg.addEventListener('error', function() {
                this.style.display = 'none';
                const parent = this.parentElement;
                if (parent) {
                    parent.innerHTML = `<div class="text-gray-600 text-center p-4"><p class="text-sm font-semibold">🖼️ Genuino Document Presentation</p><p class="text-xs text-gray-500 mt-1">[Carga una imagen en tu proyecto en: img/portada.jpg]</p></div>`;
                }
            });
        }

        // Gestión de notificaciones "Nuevo"
        const gestionarNotificacionesNuevas = () => {
            const ahora = new Date();
            const pdfButtons = document.querySelectorAll('.pdf-btn');

            pdfButtons.forEach(btn => {
                const fechaStr = btn.getAttribute('data-date');
                if (!fechaStr) return;

                const fechaSubida = new Date(fechaStr + "T00:00:00");
                const diferenciaTiempo = ahora - fechaSubida;
                const diferenciaDias = Math.floor(diferenciaTiempo / (1000 * 60 * 60 * 24));

                if (diferenciaDias >= 0 && diferenciaDias <= DIAS_NOTIFICACION) {
                    const tagNuevo = document.createElement('span');
                    tagNuevo.className = "bg-green-500 text-gray-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow group-hover:bg-white transition-colors duration-200 ml-2 shrink-0";
                    tagNuevo.innerText = "NUEVO";
                    btn.appendChild(tagNuevo);
                }
            });
        };

        gestionarNotificacionesNuevas();

        // Renderizar la página seleccionada
        const renderPage = num => {
            pageIsRendering = true;
            document.getElementById('page-num').textContent = num;

            pdfDoc.getPage(num).then(page => {
                const viewport = page.getViewport({ scale });
                if (canvas && ctx) {
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    const renderCtx = {
                        canvasContext: ctx,
                        viewport: viewport
                    };

                    page.render(renderCtx).promise.then(() => {
                        pageIsRendering = false;
                        if (pageNumPending !== null) {
                            renderPage(pageNumPending);
                            pageNumPending = null;
                        }
                    });
                }

                if (canvas) canvas.classList.remove('hidden');
                const controls = document.getElementById('controls');
                const welcome = document.getElementById('welcome-message');
                if (controls) controls.classList.remove('hidden');
                if (welcome) welcome.classList.add('hidden'); 
            });
        };

        const queueRenderPage = num => {
            if (pageIsRendering) {
                pageNumPending = num;
            } else {
                renderPage(num);
            }
        };

        const showPrevPage = () => {
            if (pageNum <= 1) return;
            pageNum--;
            queueRenderPage(pageNum);
        };

        const showNextPage = () => {
            if (pageNum >= pdfDoc.numPages) return;
            pageNum++;
            queueRenderPage(pageNum);
        };

        const loadPDF = url => {
            if (typeof pdfjsLib === 'undefined') return;
            pdfjsLib.getDocument(url).promise.then(pdfDoc_ => {
                pdfDoc = pdfDoc_;
                document.getElementById('page-count').textContent = pdfDoc.numPages;
                pageNum = 1;
                renderPage(pageNum);
            }).catch(err => {
                console.error("Error al cargar el PDF: ", err);
                alert("No se pudo cargar el archivo PDF. Asegúrate de que la ruta sea correcta.");
            });
        };

        // Manejo de acordeón de categorías
        const toggles = document.querySelectorAll('.category-toggle');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                const parent = this.parentElement;
                const submenu = parent.querySelector('.submenu');
                const arrow = parent.querySelector('.arrow-icon');

                if (submenu) submenu.classList.toggle('hidden');
                if (arrow) arrow.classList.toggle('rotated');

                document.querySelectorAll('.category-group').forEach(group => {
                    if (group !== parent) {
                        const sub = group.querySelector('.submenu');
                        const arr = group.querySelector('.arrow-icon');
                        if (sub) sub.classList.add('hidden');
                        if (arr) arr.classList.remove('rotated');
                    }
                });
            });
        });

        // Eventos de los botones PDF
        const pdfButtons = document.querySelectorAll('.pdf-btn');
        pdfButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                pdfButtons.forEach(btn => {
                    btn.classList.remove('bg-blue-600', 'text-white');
                    btn.classList.add('bg-gray-800', 'text-gray-300');
                });

                this.classList.remove('bg-gray-800', 'text-gray-300');
                this.classList.add('bg-blue-600', 'text-white');

                const url = this.getAttribute('data-pdf');
                if (url) loadPDF(url);
            });
        });

        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        if (prevBtn) prevBtn.addEventListener('click', showPrevPage);
        if (nextBtn) nextBtn.addEventListener('click', showNextPage);
    });
})();
