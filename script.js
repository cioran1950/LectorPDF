(function() {
    // Configuración de la ruta del Worker de PDF.js
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }

    let pdfDoc = null,
        pageNum = 1,
        pageIsRendering = false,
        pageNumPending = null;

    const scale = 1.5;
    const DIAS_NOTIFICACION = 3; // Días que durará el indicador "NUEVO" en los libros

    window.addEventListener('DOMContentLoaded', () => {
        const canvas = document.getElementById('pdf-render');
        const ctx = canvas ? canvas.getContext('2d') : null;

        // =========================================================================
            // 1. VALIDACIÓN DE IMAGEN DE PORTADA (RESPALDO SI NO EXISTE LA RUTA)
        // =========================================================================
        const welcomeImg = document.querySelector('.onerror-fallback');
        if (welcomeImg) {
            welcomeImg.addEventListener('error', function() {
                this.style.display = 'none';
                const parent = this.parentElement;
                if (parent) {
                    parent.innerHTML = `
                        <div class="text-gray-600 text-center p-4">
                            <p class="text-sm font-semibold">🖼️ Genuino Document Presentation</p>
                            <p class="text-xs text-gray-500 mt-1">[Carga una imagen en tu proyecto en: img/portada.jpg]</p>
                        </div>`;
                }
            });
        }

        // =========================================================================
        // 2. GESTIÓN DE NOTIFICACIONES "NUEVO" (TEMPORAL BASADO EN FECHA)
        // =========================================================================
        const gestionarNotificacionesNuevas = () => {
            const ahora = new Date();
            const pdfButtons = document.querySelectorAll('.pdf-btn');

            pdfButtons.forEach(btn => {
                const fechaStr = btn.getAttribute('data-date');
                if (!fechaStr) return;

                // Crear fecha forzando la medianoche local para evitar desfases de zona horaria
                const fechaSubida = new Date(fechaStr + "T00:00:00");
                const diferenciaTiempo = ahora - fechaSubida;
                const diferenciaDias = Math.floor(diferenciaTiempo / (1000 * 60 * 60 * 24));

                // Si los días transcurridos están dentro del rango permitido, inyectar la etiqueta
                if (diferenciaDias >= 0 && diferenciaDias <= DIAS_NOTIFICACION) {
                    const tagNuevo = document.createElement('span');
                    tagNuevo.className = "bg-green-500 text-gray-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow group-hover:bg-white transition-colors duration-200 ml-2 shrink-0";
                    tagNuevo.innerText = "NUEVO";
                    btn.appendChild(tagNuevo);
                }
            });
        };

        gestionarNotificacionesNuevas();

        // =========================================================================
        // 3. MOTOR DE RENDERIZADO DE PDF (PDF.JS)
        // =========================================================================
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

                // Cambios visuales: Mostrar visor e interfaz, ocultar bienvenida informativa
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
                alert("No se pudo cargar el archivo PDF. Asegúrate de que la ruta sea correcta y exista en el repositorio.");
            });
        };

        // =========================================================================
        // 4. INTERFACING / DELEGACIÓN DE EVENTOS GLOBAL (OPTIMIZADO PARA GITHUB)
        // =========================================================================
        document.addEventListener('click', function (e) {
            
            // ACCIÓN A: Click en el botón de desplegar categoría (Acordeón)
            const toggle = e.target.closest('.category-toggle');
            if (toggle) {
                e.preventDefault();
                const parent = toggle.parentElement;
                const submenu = parent.querySelector('.submenu');
                const arrow = parent.querySelector('.arrow-icon');

                if (submenu) submenu.classList.toggle('hidden');
                if (arrow) arrow.classList.toggle('rotated');

                // Cerrar las demás categorías abiertas para un comportamiento limpio
                document.querySelectorAll('.category-group').forEach(group => {
                    if (group !== parent) {
                        const sub = group.querySelector('.submenu');
                        const arr = group.querySelector('.arrow-icon');
                        if (sub) sub.classList.add('hidden');
                        if (arr) arr.classList.remove('rotated');
                    }
                });
                return;
            }

            // ACCIÓN B: Click en un botón de PDF específico
            const pdfBtn = e.target.closest('.pdf-btn');
            if (pdfBtn) {
                e.preventDefault();
                
                // Limpiar estilos activos de todos los botones de PDF
                document.querySelectorAll('.pdf-btn').forEach(btn => {
                    btn.classList.remove('bg-blue-600', 'text-white');
                    btn.classList.add('bg-gray-800', 'text-gray-300');
                });

                // Establecer estado activo al botón seleccionado
                pdfBtn.classList.remove('bg-gray-800', 'text-gray-300');
                pdfBtn.classList.add('bg-blue-600', 'text-white');

                // Obtener ruta del PDF y cargar
                const url = pdfBtn.getAttribute('data-pdf');
                if (url) loadPDF(url);
            }
        });

        // Controles de cambio de página
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        if (prevBtn) prevBtn.addEventListener('click', showPrevPage);
        if (nextBtn) nextBtn.addEventListener('click', showNextPage);

        // =========================================================================
        // 5. COMPORTAMIENTO INICIAL DEL MENÚ (SIN CARGA FORZADA DE CANVAS)
        // =========================================================================
        // Abre visualmente la primera sección al ingresar, manteniendo la pantalla de inicio visible.
        const defaultSubmenu = document.getElementById('submenu-laura');
        if (defaultSubmenu) {
            defaultSubmenu.classList.remove('hidden');
            const targetArrow = defaultSubmenu.parentElement.querySelector('.arrow-icon');
            if (targetArrow) targetArrow.classList.add('rotated');
        }
    });
})();
