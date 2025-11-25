import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Medication } from '../models/medication.model';

interface AllOriginsResponse {
  contents: string;
}

@Injectable({ providedIn: 'root' })
export class IlacabakService {
  private http = inject(HttpClient);
  // Using a CORS proxy to fetch data from the external website.
  private readonly PROXY_URL = 'https://api.allorigins.win/get?url=';

  async searchDrug(drugName: string): Promise<Partial<Medication> | null> {
    try {
      // Step 1: Search for the drug to get its page URL
      const searchUrl = `https://www.ilacabak.com/ilac-arama?q=${encodeURIComponent(drugName)}`;
      const searchResponse = await firstValueFrom(
          this.http.get<AllOriginsResponse>(`${this.PROXY_URL}${encodeURIComponent(searchUrl)}`)
      );

      if (!searchResponse?.contents) {
        console.warn('IlacabakService: No content from search request.');
        return null;
      }
      
      const parser = new DOMParser();
      const searchDoc = parser.parseFromString(searchResponse.contents, 'text/html');
      
      const drugLinkEl = searchDoc.querySelector('.search-results-item a');
      if (!drugLinkEl) {
        console.log(`IlacabakService: No search result found for "${drugName}"`);
        return null;
      }

      const drugPagePath = drugLinkEl.getAttribute('href');
      if (!drugPagePath) return null;

      // Step 2: Fetch the drug's detail page
      const detailUrl = `https://www.ilacabak.com${drugPagePath}`;
      const detailResponse = await firstValueFrom(
        this.http.get<AllOriginsResponse>(`${this.PROXY_URL}${encodeURIComponent(detailUrl)}`)
      );
      
      if (!detailResponse?.contents) {
        console.warn('IlacabakService: No content from detail page request.');
        return null;
      }

      const detailDoc = parser.parseFromString(detailResponse.contents, 'text/html');

      // Step 3: Parse details from the page
      const details: Partial<Medication> = {};
      
      const findDetail = (label: string): string | null => {
         const allTds = Array.from(detailDoc.querySelectorAll('tbody td'));
         const labelTd = allTds.find(td => td.textContent?.trim() === label);
         return labelTd?.nextElementSibling?.textContent?.trim() || null;
      };

      details.company = findDetail('Firma');
      details.activeSubstance = findDetail('Etkin Madde');
      details.atcCode = findDetail('ATC Kodu');
      details.barcode = findDetail('Barkod');
      
      const priceText = detailDoc.querySelector('.price')?.textContent;
      if (priceText) {
          const priceMatch = priceText.match(/(\d+,\d+)/);
          if (priceMatch) {
              details.price = parseFloat(priceMatch[1].replace(',', '.'));
          }
      }
      
      const instructionsNode = detailDoc.querySelector('#nav-kullanim');
      if(instructionsNode) {
          details.instructions = (instructionsNode as HTMLElement).innerText.trim();
      }

      return details;

    } catch (error) {
      console.error('Error scraping ilacabak.com:', error);
      return null;
    }
  }
}
