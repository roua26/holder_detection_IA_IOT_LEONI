import { Component, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
@Component({
  selector: 'app-station1',
  imports: [CommonModule, HttpClientModule],
  templateUrl: './station1.html',
  styleUrl: './station1.css',
})
export class Station1 implements AfterViewInit {

  imageUrl = '';
  holders: any[] = [];
  cables: any[] = [];
  message = '';
  loading = false;
  private drawTimeout: any = null;
  private isDrawing = false;
  systemStatus = "NON FONCTIONNEL";
  esp32cam = true;
  esp32 = true; 
  private statusInterval: any;
  @ViewChild('canvas') canvas!: ElementRef;
  @ViewChild('img') img!: ElementRef;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) { }

  ngAfterViewInit() {
    setTimeout(() => {
      this.resetCanvas();
      console.log('Vue initialisée');
    }, 500);

    this.checkSystem();
    setInterval(() => {
      this.checkSystem();
    }, 5000);
  }


  // ===================== RÉINITIALISATION =====================
  resetCanvas() {
    try {
      if (!this.canvas) {
        console.warn('Canvas non disponible');
        return;
      }

      const canvas = this.canvas.nativeElement;
      if (!canvas) {
        console.warn('Canvas nativeElement non disponible');
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn('Context 2D non disponible');
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;
      ctx.clearRect(0, 0, 0, 0);

      console.log('Canvas réinitialisé');
    } catch (error) {
      console.error('Erreur resetCanvas:', error);
    }
  }

  // ===================== TEST IA =====================
  tester() {
    if (this.loading) {
      console.log('Déjà en cours de chargement...');
      return;
    }

    console.log('=== DÉBUT TEST ===');
    this.loading = true;
    this.message = 'Analyse en cours...';

    this.holders = [];
    this.cables = [];
    this.imageUrl = '';
    this.isDrawing = false;

    this.resetCanvas();
    this.cdr.detectChanges();

    this.http.get<any>("http://localhost:3000/test")
      .subscribe({
        next: (data) => {
          console.log('Données reçues:', data);

          this.holders = [];
          this.cables = [];
          this.imageUrl = '';

          this.imageUrl = data.image + '?t=' + new Date().getTime();
          this.holders = data.holders || [];
          this.cables = data.cables || [];
          this.message = data.message || 'Analyse terminée';

          console.log('Holders reçus:', this.holders.length);
          console.log('Câbles reçus:', this.cables.length);

          this.cdr.detectChanges();
          this.waitForImageAndDraw();

          this.loading = false;
        },
        error: (err) => {
          console.error('Erreur:', err);
          this.message = 'Erreur lors de l\'analyse';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  // ===================== ATTENDRE CHARGEMENT IMAGE =====================
  private waitForImageAndDraw() {
    // Annuler tout timeout précédent
    if (this.drawTimeout) {
      clearTimeout(this.drawTimeout);
      this.drawTimeout = null;
    }

    // Vérifier si l'image existe
    if (!this.img) {
      console.warn('Image non disponible, tentative de récupération...');
      // Réessayer après un délai
      this.drawTimeout = setTimeout(() => {
        this.waitForImageAndDraw();
      }, 300);
      return;
    }

    const imgElement = this.img.nativeElement;
    if (!imgElement) {
      console.warn('Image element non disponible, tentative de récupération...');
      this.drawTimeout = setTimeout(() => {
        this.waitForImageAndDraw();
      }, 300);
      return;
    }

    // Si l'image n'a pas de src ou est vide
    if (!imgElement.src || imgElement.src === '') {
      console.warn('Image src vide, réessai...');
      this.drawTimeout = setTimeout(() => {
        this.waitForImageAndDraw();
      }, 300);
      return;
    }

    // Attendre que l'image soit chargée
    const checkImage = () => {
      if (imgElement.complete && imgElement.naturalWidth > 0) {
        console.log('Image chargée, dessin...');
        this.drawBoxes();
      } else {
        console.log('Attente chargement image...');
        this.drawTimeout = setTimeout(checkImage, 200);
      }
    };

    // Si l'image est déjà chargée
    if (imgElement.complete && imgElement.naturalWidth > 0) {
      setTimeout(() => this.drawBoxes(), 100);
    } else {
      // Ajouter un listener
      imgElement.onload = () => {
        console.log('Image chargée via onload');
        setTimeout(() => this.drawBoxes(), 100);
      };
      imgElement.onerror = () => {
        console.error('Erreur de chargement de l\'image');
        this.loading = false;
        this.cdr.detectChanges();
      };
      // Commencer à vérifier
      this.drawTimeout = setTimeout(checkImage, 300);
    }
    this.loading = false;
  }
  // ===================== ACTIONS ESP32 =====================
  ouvrirTous() {
    this.http.get('http://localhost:3000/ouvrir')
      .subscribe({
        next: () => {
          console.log('Tous ouverts');
          this.holders.forEach(h => h.status = "NOK");
          this.drawBoxes();
        },
        error: err => console.error(err)
      });
  }

  fermerTous() {
    this.http.get('http://localhost:3000/fermer')
      .subscribe({
        next: () => {
          console.log('Tous fermés');
          this.holders.forEach(h => h.status = "OK");
          this.drawBoxes();
        },
        error: err => console.error(err)
      });
  }

  fermerHolder(id: number) {
    this.http.get(`http://localhost:3000/fermer/${id}`)
      .subscribe({
        next: () => {
          const holder = this.holders.find(h => h.id === id);
          if (holder) {
            holder.status = "OK";
            this.drawBoxes();
          }
        },
        error: err => console.error(err)
      });
  }

  ouvrirHolder(id: number) {
    this.http.get(`http://localhost:3000/ouvrir/${id}`)
      .subscribe({
        next: () => {
          const holder = this.holders.find(h => h.id === id);
          if (holder) {
            holder.status = "NOK";
            this.drawBoxes();
          }
        },
        error: err => console.error(err)
      });
  }

  // ===================== STATISTIQUES =====================
  getOpenCount(): number {
    return this.holders.filter(h => h.status === 'NOK').length;
  }

  getClosedCount(): number {
    return this.holders.filter(h => h.status === 'OK').length;
  }

  getCableCount(): number {
    return this.cables.length;
  }

  getCableStatusCount(status: string): number {
    return this.cables.filter(c => c.status === status).length;
  }

  // ===================== DESSIN DES BOXES =====================
  drawBoxes() {
    if (this.isDrawing) {
      console.log('Dessin déjà en cours...');
      return;
    }

    this.isDrawing = true;

    if (this.drawTimeout) {
      clearTimeout(this.drawTimeout);
      this.drawTimeout = null;
    }

    this.drawTimeout = setTimeout(() => {
      try {
        this.drawBoxesInternal();
      } catch (error) {
        console.error('Erreur dans drawBoxes:', error);
      } finally {
        this.isDrawing = false;
        this.cdr.detectChanges();
      }
    }, 200);
  }

  private drawBoxesInternal() {
    try {
      if (!this.canvas || !this.img) {
        console.warn('Canvas ou Image non disponibles');
        return;
      }

      const canvas = this.canvas.nativeElement;
      const ctx = canvas.getContext('2d');
      const img = this.img.nativeElement;

      if (!canvas || !ctx || !img) {
        console.warn('Éléments non disponibles');
        return;
      }

      if (!img.complete || !img.naturalWidth) {
        console.warn('Image pas chargée, réessai...');
        setTimeout(() => this.drawBoxesInternal(), 300);
        return;
      }

      console.log('Dessin des holders:', this.holders.length);
      console.log('Dessin des câbles:', this.cables.length);

      // --- RÉINITIALISATION ---
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = img.clientWidth || img.naturalWidth || 640;
      canvas.height = img.clientHeight || img.naturalHeight || 480;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      const scaleX = canvas.width / img.naturalWidth;
      const scaleY = canvas.height / img.naturalHeight;

      console.log(`Canvas: ${canvas.width}x${canvas.height}, Scale: ${scaleX.toFixed(3)}x${scaleY.toFixed(3)}`);

      // --- DESSIN DES HOLDERS ---
      if (this.holders && this.holders.length > 0) {
        this.holders.forEach((holder) => {
          const b = holder.box;
          if (!b) return;

          const isOpen = holder.status === "NOK";
          const color = isOpen ? "#FF1744" : "#00E676";
          const bgColor = isOpen ? "rgba(255, 23, 68, 0.15)" : "rgba(0, 230, 118, 0.15)";

          const x = b.x * scaleX;
          const y = b.y * scaleY;
          const w = b.w * scaleX;
          const h = b.h * scaleY;

          ctx.fillStyle = bgColor;
          ctx.fillRect(x, y, w, h);

          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.shadowColor = color + '40';
          ctx.shadowBlur = 8;
          ctx.strokeRect(x, y, w, h);
          ctx.shadowBlur = 0;

          const label = `H${holder.id} ${holder.status}`;
          ctx.font = "bold 16px Arial";
          const metrics = ctx.measureText(label);
          const textWidth = metrics.width;
          const textHeight = 24;
          const textX = x;
          const textY = y - 10;

          ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
          ctx.fillRect(textX - 6, textY - textHeight - 2, textWidth + 12, textHeight + 6);

          ctx.fillStyle = color;
          ctx.font = "bold 16px Arial";
          ctx.fillText(label, textX, textY);

          if (holder.confidence) {
            const confidenceText = `${holder.confidence}%`;
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            ctx.font = "12px Arial";
            const confWidth = ctx.measureText(confidenceText).width;
            ctx.fillRect(x, y + h + 2, confWidth + 10, 20);
            ctx.fillStyle = "white";
            ctx.font = "12px Arial";
            ctx.fillText(confidenceText, x + 4, y + h + 16);
          }
        });
      }


      // --- DESSIN DES CÂBLES ---
      if (this.cables && this.cables.length > 0) {
        this.cables.forEach((cable, index) => {
          const b = cable.box;
          if (!b) return;

          // Déterminer la couleur en fonction du statut du câble
          const isOk = cable.status === "OK" || cable.status === "CONNECTÉ" || cable.status === "connecté";
          const color = isOk ? "#00E676" : "#FF1744"; // Vert si OK, Rouge si NOT OK
          const bgColor = isOk ? "rgba(0, 230, 118, 0.15)" : "rgba(255, 23, 68, 0.15)";

          const x = b.x * scaleX;
          const y = b.y * scaleY;
          const w = b.w * scaleX;
          const h = b.h * scaleY;

          // Fond
          ctx.fillStyle = bgColor;
          ctx.fillRect(x, y, w, h);

          // Rectangle (plein, pas de pointillés)
          ctx.strokeStyle = color;
          ctx.lineWidth = 3; // Plus épais pour mieux voir
          ctx.shadowColor = color + '40';
          ctx.shadowBlur = 8;
          ctx.strokeRect(x, y, w, h);
          ctx.shadowBlur = 0;

          // Texte avec statut
          const statusText = isOk ? "✅ OK" : "❌ NOT OK";
          const label = `C${index + 1} ${statusText}`;
          ctx.font = "bold 14px Arial";
          const metrics = ctx.measureText(label);
          const textWidth = metrics.width;
          const textHeight = 22;
          const textX = x;
          const textY = y - 10;

          // Fond du texte
          ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
          ctx.fillRect(textX - 6, textY - textHeight - 2, textWidth + 12, textHeight + 6);

          // Texte
          ctx.fillStyle = color;
          ctx.font = "bold 14px Arial";
          ctx.fillText(label, textX, textY);

          // Confiance
          if (cable.confidence) {
            const confidenceText = `${cable.confidence}%`;
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            ctx.font = "11px Arial";
            const confWidth = ctx.measureText(confidenceText).width;
            ctx.fillRect(x, y + h + 2, confWidth + 10, 18);
            ctx.fillStyle = "white";
            ctx.font = "11px Arial";
            ctx.fillText(confidenceText, x + 4, y + h + 15);
          }
        });
      }
      console.log('Dessin terminé avec succès');

    } catch (error) {
      console.error('Erreur dans drawBoxesInternal:', error);
    }
  }

  // ===================== RÉINITIALISATION COMPLÈTE =====================
  resetAll() {
    console.log('=== RÉINITIALISATION COMPLÈTE ===');
    this.holders = [];
    this.cables = [];
    this.imageUrl = '';
    this.message = '';
    this.loading = false;
    this.isDrawing = false;

    if (this.drawTimeout) {
      clearTimeout(this.drawTimeout);
      this.drawTimeout = null;
    }

    this.resetCanvas();
    this.cdr.detectChanges();
  }

  checkSystem() {

    this.http.get<any>(
      "http://localhost:3000/system/status"
    ).subscribe(data => {

      this.systemStatus = data.system;

      this.esp32cam = data.esp32cam;

      this.esp32 = data.esp32;

    });

  }
  isSystemReady(): boolean {
  return this.systemStatus === "ACTIVE";
  }
  ngOnDestroy() {
    if (this.drawTimeout) {
      clearTimeout(this.drawTimeout);
      this.drawTimeout = null;
    }
    if (this.statusInterval) {
    clearInterval(this.statusInterval);
  }
  }
}