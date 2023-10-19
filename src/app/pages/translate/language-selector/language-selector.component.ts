import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Store} from '@ngxs/store';
import {Observable, switchMap} from 'rxjs';
import {TranslocoService} from '@ngneat/transloco';
import {filter, takeUntil, tap} from 'rxjs/operators';
import {BaseComponent} from '../../../components/base/base.component';
import {IANASignedLanguages} from '../../../core/helpers/iana/languages';

const IntlTypeMap: {[key: string]: Intl.DisplayNamesType} = {languages: 'language', countries: 'region'};

@Component({
  selector: 'app-language-selector',
  templateUrl: './language-selector.component.html',
  styleUrls: ['./language-selector.component.scss'],
})
export class LanguageSelectorComponent extends BaseComponent implements OnInit {
  detectedLanguage$: Observable<string>;

  @Input() flags = false;
  @Input() hasLanguageDetection = false;
  @Input() languages: string[];
  @Input() translationKey: string;
  @Input() urlParameter: string;

  @Input() language: string;

  @Output() languageChange = new EventEmitter<string>();

  topLanguages: string[];
  selectedIndex = 0;

  displayNames: Intl.DisplayNames;
  langNames: {[lang: string]: string} = {};
  langCountries: {[lang: string]: string} = {};

  constructor(private store: Store, private transloco: TranslocoService) {
    super();

    this.detectedLanguage$ = this.store.select<string>(state => state.translate.detectedLanguage);
  }

  ngOnInit(): void {
    this.topLanguages = this.languages.slice(0, 3);

    const searchParams = 'window' in globalThis ? window.location.search : '';
    const urlParams = new URLSearchParams(searchParams);
    const initial = urlParams.get(this.urlParameter) || this.languages[0];
    this.selectLanguage(initial);

    // Initialize langNames, relevant for SSR
    this.setLangNames(this.transloco.getActiveLang());
    this.transloco.langChanges$
      .pipe(
        // wait until relevant language file has been loaded
        switchMap(() => this.transloco.events$),
        filter(e => e.type === 'translationLoadSuccess' && e.payload.scope === this.translationKey),
        tap(() => this.setLangNames(this.transloco.getActiveLang())),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe();

    this.setLangCountries();
  }

  langName(lang: string): string {
    if (this.displayNames && lang.length === 2) {
      const result = this.displayNames.of(lang.toUpperCase());
      if (result && result !== lang) {
        return result;
      }
    }

    // Fallback to predefined list
    return this.transloco.translate(`${this.translationKey}.${lang}`);
  }

  setLangNames(locale: string) {
    if (this.translationKey in IntlTypeMap) {
      this.displayNames = new Intl.DisplayNames([locale], {type: IntlTypeMap[this.translationKey]});
      if (this.displayNames.resolvedOptions().locale !== locale) {
        console.error('Failed to set language display names for locale', locale);
        delete this.displayNames;
      }
    }

    for (const lang of this.languages) {
      this.langNames[lang] = this.langName(lang);
    }
  }

  setLangCountries() {
    const key = this.translationKey === 'languages' ? 'language' : 'signed';
    for (const lang of this.languages) {
      const match = IANASignedLanguages.find(l => l[key] === lang);
      this.langCountries[lang] = match?.country ?? 'xx';
    }

    // World flag
    this.langCountries.ils = 'ils';
  }

  selectLanguage(lang: string): void {
    if (lang === this.language) {
      return;
    }

    if (lang && !this.topLanguages.includes(lang)) {
      this.topLanguages.unshift(lang);
      this.topLanguages.pop();
    }

    // Update selected language
    this.language = lang;
    this.languageChange.emit(this.language);

    const index = this.topLanguages.indexOf(this.language);
    this.selectedIndex = index + Number(this.hasLanguageDetection);
  }

  selectLanguageIndex(index: number): void {
    if (index === 0 && this.hasLanguageDetection) {
      this.selectLanguage(null);
    } else {
      this.selectLanguage(this.topLanguages[index - Number(this.hasLanguageDetection)]);
    }
  }
}
