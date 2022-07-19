import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GlobalConstants } from '../global-constants';
import { AppService } from '../service/common/app.service';
import { FileUploadService } from '../service/file-upload.service';
import { VantageService } from '../service/vantage.service';
import { Connection } from '../shared/connection';

@Component({
  selector: 'app-data-preperation',
  templateUrl: './data-preperation.component.html',
  styleUrls: ['./data-preperation.component.css'],
})
export class DataPreperationComponent
  implements OnInit, AfterViewInit, OnDestroy {
  config: Connection;
  databases: string[] = ['Select Database'];
  tables: string[] = ['Select Table'];
  columns: string[] = ['Select Column'];

  selectedDb: string = ''; //DB Name from left side dropdown
  selectedtable: string = ''; //Table Name from left side dropdown
  selectedColumn: string = ''; //Depenedent Column Name from left side dropdown

  inprogress: boolean = false;
  loading: boolean = false;
  file: File; // Variable to store file
  filename: string = 'Choose file';
  message: string = '';
  errorMsg: string = '';
  isTeradataConnectionAlive: boolean = false;
  initRunMessage: string = '';
  isFileUploadFailed: boolean = false;

  rowCount: number = 0;
  testsetsize: number = 0;
  trainsetsize: number = 0;
  top5data: any[] = [];
  ncols: string[] = [];
  ccols: string[] = [];
  question: any;
  options: any;

  isColumnSelectToDrop: boolean = false;
  dropCols: string[] = [];
  remainingCols: string[] = [];
  isFeatureContinue: boolean = false;
  isUnivariateStatisticsRunning:boolean = false;
  isUnivariateStatisticsResultAvailable:boolean = false;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private vantageService: VantageService,
    private appService: AppService,
    private fileUploadService: FileUploadService
  ) { }

  ngAfterViewInit(): void {
    this.appService.dataprepPage.next(true);
  }
  ngOnDestroy(): void {
    this.appService.dataprepPage.next(true);
  }

  ngOnInit(): void {
    let state = history.state;
    delete state['navigationId'];
    this.config = state;

    //console.log(this.config);
    this.vantageService.getDatabases(this.config).subscribe({
      next: (response) => {
        //console.log(response);
        this.errorMsg = '';
        this.isTeradataConnectionAlive = true;
        this.databases = response.databases;
        //this.database_bkp = response.database
      },
      error: (error) => {
        //console.log(error);
        if (error.error_code === GlobalConstants.No_db_Session) {
          this.clear();
          this.isTeradataConnectionAlive = false;
          this.errorMsg = 'Please connect to Server!';
          // setTimeout(() => {
          //   this.router.navigate(['/connection'], {
          //     relativeTo: this.activatedRoute,
          //   });
          // }, 4000);
        }
      },
    });
  }

  changeDropdown(x: any, type: String) {
    switch (type) {
      case 'database':
        this.selectedDb = x.value;
        this.tables = ['Select Table'];
        this.columns = ['Select Column'];
        this.selectedtable = '';
        this.selectedColumn = '';
        this.vantageService.getTables(this.config, this.selectedDb).subscribe({
          next: (response) => {
            // console.log(response);
            this.errorMsg = '';
            this.isTeradataConnectionAlive = true;
            this.tables = response.tables;
          },
          error: (error) => {
            if (error.error_code === GlobalConstants.No_db_Session) {
              this.errorMsg = 'Please connect to Server!';
              this.isTeradataConnectionAlive = false;
              this.clear();
              setTimeout(() => {
                this.router.navigate(['/connection'], {
                  relativeTo: this.activatedRoute,
                });
              }, 4000);
            }
          },
        });
        break;
      case 'table':
        this.selectedtable = x.value;
        this.columns = ['Select Column'];
        this.selectedColumn = '';

        this.vantageService
          .getColumns(this.config, this.selectedDb, this.selectedtable)
          .subscribe({
            next: (response) => {
              //console.log(response);
              this.errorMsg = '';
              this.isTeradataConnectionAlive = true;
              this.columns = response.colums;
            },
            error: (error) => {
              if (error.error_code === GlobalConstants.No_db_Session) {
                this.errorMsg = 'Please connect to Server!';
                this.isTeradataConnectionAlive = false;
                this.clear();
                setTimeout(() => {
                  this.router.navigate(['/connection'], {
                    relativeTo: this.activatedRoute,
                  });
                }, 4000);
              }
            },
          });
        break;
      case 'column':
        this.selectedColumn = x.value;
        break;
    }
  }

  init = () => {
    this.inprogress = true;
    this.isTeradataConnectionAlive = true;
    this.message = '';
    this.vantageService
      .init(
        this.config,
        this.selectedDb,
        this.selectedtable,
        this.selectedColumn
      )
      .subscribe({
        next: (response) => {
          this.inprogress = false;
          this.errorMsg = '';
          this.initRunMessage = 'Below are basic finding..';
          let {
            rowCount,
            testsetsize,
            trainsetsize,
            top5data,
            ncols,
            ccols,
            question,
          } = response.message;
          this.rowCount = rowCount;
          this.testsetsize = testsetsize;
          this.top5data = top5data;
          this.ncols = ncols;
          this.ccols = ccols;
          this.trainsetsize = trainsetsize;
          this.question = question.name;
          this.options = question.options;
        },
        error: (error) => {
          this.clear();
          this.handleError(error);
        },
      });
  };

  // On file Select
  onChange(event: any) {
    this.file = event.target.files[0];
    this.filename = event.target.files[0].name;
  }

  upload = () => {
    this.loading = !this.loading;
    this.fileUploadService.upload(this.file).subscribe({
      next: (data) => {
        this.isFileUploadFailed = false;
        this.loading = false;
        this.message = data.message;
        this.filename = 'Choose file';
      },
      error: (error) => {
        this.isFileUploadFailed = true;
        this.message = 'Not uploaded. Pls. retry with correct file!';
        this.loading = false;
        this.filename = 'Choose file';
      },
    });
  };

  clear = () => {
    this.selectedDb = '';
    this.selectedtable = '';
    this.selectedColumn = '';

    this.tables = ['Select Table'];
    this.columns = ['Select Column'];

    this.inprogress = false;
    this.loading = false;
    this.isFileUploadFailed = false;
  };

  restartProcess = () => {
    this.clear();
    this.initRunMessage = '';
  };

  deleteColumn = (val: String) => {
    this.isFeatureContinue = true;
    switch (val) {
      case 'Y':
        this.addRemainingItem();
        ///console.log('Yes Clicked');
        this.isColumnSelectToDrop = true;
        break;

      case 'N':
        //console.log('No Clicked');
        this.isColumnSelectToDrop = false;
        this.dropCols = [];
        this.remainingCols = this.columns;
        break;
    }
  };

  selectColumnToDrop = (x: any) => {
    let isMatchFound = false;
    for (let i = 0; i < this.dropCols.length; i++) {
      if (x.value === this.dropCols[i]) {
        isMatchFound = true;
        break;
      }
    }

    if (!isMatchFound) {
      this.dropCols.push(x.value);
    }
    this.addRemainingItem();
  };

  removeItem = (item: any) => {
    for (let i = 0; i < this.dropCols.length; i++) {
      if (item === this.dropCols[i]) {
        this.dropCols.splice(i, 1);
        break;
      }
    }
    this.addRemainingItem();
  };

  addRemainingItem = () => {
    let temp: string[] = [];
    for (let i = 0; i < this.columns.length; i++) {
      let matchFound = false;

      for (let j = 0; j < this.dropCols.length; j++) {
        if (this.columns[i] === this.dropCols[j]) {
          matchFound = true;
          break;
        }
      }

      if (!matchFound) {
        temp.push(this.columns[i]);
      }

      this.remainingCols = temp;
    }
  };

  performUnivariateStatistics = () => {
    this.isUnivariateStatisticsRunning = true;
    this.vantageService
      .performUnivariateStatistics(
        this.config,
        this.selectedDb,
        this.selectedtable,
        this.selectedColumn,
        this.remainingCols,
        this.columns
      )
      .subscribe({
        next: (data) => {
          this.isUnivariateStatisticsRunning = false;
          this.isUnivariateStatisticsResultAvailable = true;
          console.log(data);
        },
        error: (error) => {
          this.isUnivariateStatisticsRunning = false;
          this.isUnivariateStatisticsResultAvailable = true;
          this.handleError(error);
        },
      });
  };

  //Error Handling
  handleError = (error: any) => {
    if (error.error_code) {
      switch (error.error_code) {
        case GlobalConstants.No_Config_File:
          this.errorMsg = 'The configuration file is missing. Please upload!';
          break;
        case GlobalConstants.Config_File_Incorrect_Format:
          this.errorMsg = 'The configuration file has incorrect format. Please uplaod correct one!';
          break;
        case GlobalConstants.Missing_Required_Input:
          this.errorMsg = 'Some data are missing while requesting. Please contact with system administrator!';
          break;
        case GlobalConstants.No_db_Session:
          this.errorMsg = 'Please connect to Server!';
          this.isTeradataConnectionAlive = false;
          setTimeout(() => {
            this.router.navigate(['/connection'], {
              relativeTo: this.activatedRoute,
            });
          }, 4000);
          break;
        case GlobalConstants.Error_500:
          this.errorMsg = 'There is some server errors. Please try after sometime!';
          break;
        default:
          this.errorMsg = 'Some error occured. Please start from begining!';
          setTimeout(() => {
            this.router.navigate(['/connection'], {
              relativeTo: this.activatedRoute,
            });
          }, 4000);
      }
    } else {
      this.errorMsg = 'There is some server errors. Please try after sometime!';
    }
  };
}
