// Configuración de la ruta del Worker de PDF.js para mejorar el rendimiento hilos separados
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let pdfDoc = null,
    pageNum = 1,
    pageIsRendering = false,
    pageNumPending = null;

const scale = 1.5, // Ajusta este valor si quieres que el PDF se renderice con mayor o menor nitidez inicial
      canvas = document.getElementById('pdf-render'),
      ctx = canvas.getContext('2d');

// Renderizar la página seleccionada
const renderPage = num => {
    pageIsRendering = true;
    document.getElementById('page-num').textContent = num;

    pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({ scale });
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

        // Mostrar el canvas y los controles, ocultar bienvenida
        canvas.classList.remove('hidden');
        document.getElementById('controls').classList.remove('hidden');
        document.getElementById('welcome-message').classList.add('hidden');
    });
};

// Validar colas de renderizado
const queueRenderPage = num => {
    if (pageIsRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
};

// Ir a página anterior
const showPrevPage = () => {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
};

// Ir a página siguiente
const showNextPage = () => {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
};

// Cargar el documento PDF de manera dinámica
const loadPDF = url => {
    pdfjsLib.getDocument(url).promise.then(pdfDoc_ => {
        pdfDoc = pdfDoc_;
        document.getElementById('page-count').textContent = pdfDoc.numPages;
        pageNum = 1; // Reiniciar siempre a la primera página
        renderPage(pageNum);
    }).catch(err => {
        console.error("Error al cargar el PDF: ", err);
        alert("No se pudo cargar el archivo PDF. Asegúrate de que la ruta sea correcta.");
    });
};

// Eventos del Menú Lateral
document.querySelectorAll('.pdf-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        // Estilos visuales de botón activo
        document.querySelectorAll('.pdf-btn').forEach(btn => btn.classList.remove('bg-blue-600'));
        e.currentTarget.classList.add('bg-blue-600');
        
        // Obtener ruta y cargar
        const pdfUrl = e.currentTarget.getAttribute('data-pdf');
        loadPDF(pdfUrl);
    });
});

// Eventos de botones de navegación
document.getElementById('prev-page').addEventListener('click', showPrevPage);
document.getElementById('next-page').addEventListener('click', showNextPage);