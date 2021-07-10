import {Component, Injectable, OnInit} from '@angular/core';
import {Observable, of, throwError} from "rxjs";
import {catchError, filter, map} from "rxjs/operators";
import {AdSetDetails, AdSetsClient, GetAdSetDetailsResponse, SwaggerException} from "../client-generated-by-nswag";

function isDefined<T>(arg: T | null | undefined): arg is T {
  return arg !== null && arg !== undefined;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: []
})
@Injectable()
export class AppComponent {
  constructor(private adSetClient: AdSetsClient) {
    this.adSet$ = this.adSetClient.getById(12).pipe(
      map(response => response?.adSet),
      filter(isDefined),
      // Of course this is not how you should handle errors
      catchError((error: SwaggerException) => error.status == 404 ? of({name: "Ad set not found"} as AdSetDetails) : throwError(error))
    );
  }

  adSet$: Observable<AdSetDetails>;
}
