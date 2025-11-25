import { Injectable } from '@angular/core';

export interface VapiMedicationInfo {
  name: string;
  activeSubstance: string;
  usage: string;
  indications: string[];
  contraindications: string;
  sideEffects: string;
  dosage: string;
}

@Injectable({ providedIn: 'root' })
export class VapiService {

  // Dummy data simulating a response from an API like VAPI
  private dummyData: { [key: string]: VapiMedicationInfo } = {
    'parol': {
      name: "PAROL 500 mg Tablet",
      activeSubstance: "Parasetamol",
      usage: "Ağrı kesici (analjezik) ve ateş düşürücü (antipiretik) etkilere sahiptir.",
      indications: [
        "Hafif ve orta şiddetli ağrılar (baş ağrısı, migren, diş ağrısı, adet sancıları).",
        "Soğuk algınlığı ve grip semptomlarına bağlı ateş ve ağrı."
      ],
      contraindications: "Parasetamole veya ilacın diğer bileşenlerine karşı alerjiniz varsa kullanmayınız. Şiddetli karaciğer veya böbrek yetmezliğiniz varsa doktorunuza danışınız.",
      sideEffects: "Nadiren cilt döküntüleri, kaşıntı veya alerjik reaksiyonlar görülebilir. Çok nadir durumlarda kan tablosunda bozulmalar olabilir. Beklenmeyen bir etki gördüğünüzde doktorunuza başvurunuz.",
      dosage: "Yetişkinlerde ve 12 yaşından büyük çocuklarda: 4-6 saatte bir 1-2 tablet. Günde 8 tabletten (4000 mg) fazla alınmamalıdır."
    },
    'augmentin': {
        name: "AUGMENTIN-BID 1000 mg Film Tablet",
        activeSubstance: "Amoksisilin + Klavulanik Asit",
        usage: "Geniş spektrumlu bir antibiyotiktir. Bakteriyel enfeksiyonların tedavisinde kullanılır.",
        indications: [
            "Üst solunum yolu enfeksiyonları (sinüzit, tonsilit, otitis media).",
            "Alt solunum yolu enfeksiyonları (kronik bronşit, pnömoni).",
            "Deri ve yumuşak doku enfeksiyonları.",
            "İdrar yolu enfeksiyonları."
        ],
        contraindications: "Penisilin veya beta-laktam antibiyotiklere karşı bilinen aşırı duyarlılık durumlarında kullanılmamalıdır. Geçmişte Augmentin veya penisilin kullanımına bağlı sarılık/karaciğer fonksiyon bozukluğu öyküsü olanlarda kontrendikedir.",
        sideEffects: "En sık görülen yan etkiler ishal, bulantı, kusma ve mukokutanöz kandidiyazistir. Cilt döküntüsü, kaşıntı gibi alerjik reaksiyonlar görülebilir. Ciddi bir alerjik reaksiyon (anafilaksi) belirtisi olursa derhal tıbbi yardım alınmalıdır.",
        dosage: "Doktor tarafından başka şekilde tavsiye edilmedikçe, yetişkinlerde ve 40 kg'ın üzerindeki çocuklarda günde iki kez bir tablettir. Tedavi süresi enfeksiyonun şiddetine göre doktor tarafından belirlenir."
    }
  };

  async getMedicationInfo(name: string): Promise<VapiMedicationInfo | null> {
    console.log(`[VapiService] Simulating API call for: ${name}`);
    const key = name.toLowerCase().split(' ')[0]; // Use the first word for matching

    return new Promise(resolve => {
      setTimeout(() => {
        const result = this.dummyData[key] || null;
        if (result) {
          console.log(`[VapiService] Found dummy data for key: ${key}`);
        } else {
          console.warn(`[VapiService] No dummy data found for key: ${key}`);
        }
        resolve(result);
      }, 1500); // Simulate network delay
    });
  }
}