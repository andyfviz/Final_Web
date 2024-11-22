document.addEventListener("DOMContentLoaded", () => {
    const progressBar = document.getElementById("progress-bar");
    const loader = document.getElementById("loader");
    const mainContent = document.getElementById("main-content");
    const targetURL = "Entree.html"; 
    let progress = 0;

    const interval = setInterval(() => {
        progress += 10;
        progressBar.style.width = `${progress}%`;

        if (progress >= 100) {
            clearInterval(interval);
            // Mostrar contenido principal o redirigir
            window.location.href = targetURL;
        }
    }, 300); // Intervalo para simular carga
});