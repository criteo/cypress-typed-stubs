import { Component, Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, filter, map } from 'rxjs/operators';
import { AdSetDetails, AdSetsClient, SwaggerException } from '../client-generated-by-nswag';

function isDefined<T>(arg: T | null | undefined): arg is T {
  return arg !== null && arg !== undefined;
}

interface Language {
  code: string;
  name: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [],
})
@Injectable()
export class AppComponent {
  languages: Language[] = [
    { code: 'en-US', name: 'English' },
    { code: 'fr-FR', name: 'Français' },
  ];

  onLanguageSelected() {
    this.adSet$ = this.fetchAdSet();
  }

  constructor(private readonly adSetClient: AdSetsClient) {
    this.adSet$ = this.fetchAdSet();
  }

  private fetchAdSet(): Observable<AdSetDetails> {
    return this.adSetClient.getById(12, this.selectedLanguageCode).pipe(
      map((response) => response?.adSet),
      filter(isDefined),
      // Of course this is not how you should handle errors
      catchError((error: SwaggerException) =>
        error.status == 404 ? of({ name: 'Ad set not found' } as AdSetDetails) : throwError(error)
      )
    );
  }

  adSet$: Observable<AdSetDetails>;
  selectedLanguageCode: string = this.languages[0].code;
}
