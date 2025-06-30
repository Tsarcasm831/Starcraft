export class PromoModal {
    init() {
        document.getElementById('close-promo-modal')?.addEventListener('click', () => this.toggle());
        document.getElementById('promo-modal')?.addEventListener('click', (event) => {
            if (event.target === event.currentTarget) {
                this.toggle();
            }
        });
    }

    toggle() {
        const modal = document.getElementById('promo-modal');
        const iframe = document.getElementById('promo-video');
        if (!modal) return;

        modal.classList.toggle('hidden');
        if (iframe) {
            if (modal.classList.contains('hidden')) {
                iframe.src = '';
            } else {
                iframe.src = 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1';
            }
        }
    }
}
