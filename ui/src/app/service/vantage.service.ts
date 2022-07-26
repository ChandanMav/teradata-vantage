import { HttpClient, HttpHeaders, HttpErrorResponse, } from '@angular/common/http';
import { catchError, Observable, retry, Subject, throwError } from 'rxjs';
import { Injectable } from '@angular/core';
import { Connection } from '../shared/connection';
import { Constants } from '../config/constants';
import { AppService } from './common/app.service';
import { CommaSeperatedPipe } from '../pipes/comma-seperated.pipe';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
};


@Injectable({
  providedIn: 'root'
})
export class VantageService {


  constructor(private http: HttpClient, private appService: AppService) { }

  rootURL = this.appService.rootURL;

  public getDatabases(connection: Connection): Observable<any> {
    let body = JSON.stringify(connection);
    return this.http.post(this.rootURL + '/api/databases', body, httpOptions)
      .pipe(

        catchError((error) => this.appService.handleError(error))
      );;
  }

  public getTables(connection: Connection, dbName: String): Observable<any> {
    let body = JSON.stringify(connection);
    return this.http.post(this.rootURL + '/api/databases/' + dbName + '/tables', body, httpOptions)
      .pipe(

        catchError((error) => this.appService.handleError(error))
      );;
  }

  public getColumns(connection: Connection, dbName: String, tableName: String): Observable<any> {
    let body = JSON.stringify(connection);
    return this.http.post(this.rootURL + '/api/databases/' + dbName + '/tables/' + tableName + '/columns', body, httpOptions)
      .pipe(

        catchError((error) => this.appService.handleError(error))
      );;
  }


  public init(connection: Connection, db: String, basetable: String, col: String): Observable<any> {
    let body = { ...connection, db, basetable, col }
    //console.log(body);
    return this.http.post(this.rootURL + '/api/vantage/init', body, httpOptions)
      .pipe(

        catchError((error) => this.appService.handleError(error))
      );;

  }

  public performUnivariateStatistics(connection: Connection, db: String, basetable: String, col: String, temp: string[], allCols: string[], nCols: string[], key: string): Observable<any> {
    let commaSeperatedPipe = new CommaSeperatedPipe();
    let body = {
      ...connection, db, basetable, dep_col: col, allCols: commaSeperatedPipe.transform(allCols), remainingCols: commaSeperatedPipe.transform(temp),
      nCols: commaSeperatedPipe.transform(nCols),
      key
    } //Here the remainingCols will contain dependent column as well

    //console.log(body);
    return this.http.post(this.rootURL + '/api/vantage/univariate', body, httpOptions)
      .pipe(
        catchError((error) => this.appService.handleError(error))
      );

  }

  convertNumericalToCategorical(connection: Connection, selectedDb: string, baseTable: string, newBaseTable: string, selectedNColumnsForConversionList:string[]): Observable<any> {
    let commaSeperatedPipe = new CommaSeperatedPipe();
    let body = {
      ...connection, db: selectedDb, basetable: baseTable, new_basetable: newBaseTable,  cCols: commaSeperatedPipe.transform(selectedNColumnsForConversionList)
    }

    console.log(body);
    return this.http.post(this.rootURL + '/api/vantage/numuric/conversion', body, httpOptions)
      .pipe(
        catchError((error) => this.appService.handleError(error))
      );
  }


  performOutlierHandlingSrvc(connection: Connection, selectedDb: string, baseTable: string, dependentCol: string): Observable<any> {
    let body = {
      ...connection, db: selectedDb, basetable: baseTable, dep_col: dependentCol
    }

    console.log(body);
    return this.http.post(this.rootURL + '/api/vantage/outlier', body, httpOptions)
      .pipe(

        catchError((error) => this.appService.handleError(error))
      );
  }

  performClusterNullValueImputingSrvc(connection: Connection, selectedDb: string, baseTable: string, dependentCol: string): Observable<any> {
    let body = {
      ...connection, db: selectedDb, basetable: baseTable, dep_col: dependentCol
    }

    console.log(body);
    return this.http.post(this.rootURL + '/api/vantage/clusternullvalue', body, httpOptions)
      .pipe(

        catchError((error) => this.appService.handleError(error))
      );
  }

  performBasicNullImputingServc(connection: Connection, selectedDb: string, baseTable: string, basicnullcolval: any): Observable<any> {
    let body = {
      ...connection, db: selectedDb, basetable: baseTable, basicnullcolval: basicnullcolval
    }

    console.log(body);
    return this.http.post(this.rootURL + '/api/vantage/basicnullvalue', body, httpOptions)
      .pipe(
        catchError((error) => this.appService.handleError(error))
      );
  }

  getAllAutomatedDTSteps(): Observable<any> {
    return this.http.get(this.rootURL + '/api/vantage/automateddt/steps')
      .pipe(

        catchError((error) => this.appService.handleError(error))
      );;
  }

  getModelBuildFlow(): Observable<any> {
    return this.http.get(this.rootURL + '/api/vantage/flows')
      .pipe(

        catchError((error) => this.appService.handleError(error))
      );;
  }

  public getQuestion(qid: number): Observable<any> {
    return this.http.get(this.rootURL + '/api/vantage/question/' + qid)
      .pipe(

        catchError((error) => this.appService.handleError(error))
      );;
  }



}
