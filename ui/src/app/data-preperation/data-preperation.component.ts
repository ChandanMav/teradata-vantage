import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GlobalConstants } from '../global-constants';
import { AppService } from '../service/common/app.service';
import { FileUploadService } from '../service/file-upload.service';
import { VantageService } from '../service/vantage.service';
import { Connection } from '../shared/connection';
import { questions } from '../shared/question'

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

  questions: any = questions;
  isColumnSelectToDrop: boolean = false;
  dropCols: string[] = [];
  remainingCols: string[] = [];
  isFeatureContinue: boolean = false;
  isUnivariateStatisticsRunning: boolean = false;
  isUnivariateStatisticsResultAvailable: boolean = false;
  isAutomatedDT: boolean = false;
  univariateStatisticsResult = [];
  univariateStatisticsResultAttr: string[] = [];
  baseTable: string = "";
  dependentCol: string = "";
  remainingNcols: string[] = [];
  remainingCCols: string[] = [];
  isNumericToCategorical: boolean = false;
  selectedNColumnsForConversionList: string[] = [];

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


  //Get List of Database
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

  //Get List of Table and Columns
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
        this.baseTable = this.selectedtable;
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
        this.dependentCol = this.selectedColumn;
        break;
    }
  }

  //Get Basic Info
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

          this.remainingNcols = this.ncols;
          this.remainingCCols = this.ccols;

          this.questions.q1 = {
            qname: question.name,
            options: question.options
          }
        },
        error: (error) => {
          this.clear();
          this.handleError(error);
        },
      });
  };




  //Delete Column
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
        this.remainingNcols = this.ncols;
        this.remainingCCols = this.ccols;
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
    this.remainingCols = this.getRemainingCols("All");
    this.remainingNcols = this.getRemainingCols("Num");
    this.remainingCCols = this.getRemainingCols("Cat");
  };

  /*
   1. Delete the Column
   2. Create Work Table
   3. Change the base table
   4. Perform Univariate Statistics
  */
  performUnivariateStatistics = () => {
    this.isUnivariateStatisticsRunning = true;
    //Get Key
    let key: string = this.dropCols.length === 0 ? "N" : "Y";

    // console.log("All Column List", this.columns)
    // console.log("Drop Column List", this.dropCols);
    // console.log("All remaining Column List", this.remainingCols);
    // console.log("Remaining Numerical Column List", this.remainingNcols);
    // console.log("Remaining Categorical Column List", this.remainingCCols);

    this.vantageService
      .performUnivariateStatistics(
        this.config,
        this.selectedDb,
        this.baseTable,
        this.dependentCol,
        this.remainingCols,
        this.columns,
        this.remainingNcols,
        key
      )
      .subscribe({
        next: (response) => {
          this.isUnivariateStatisticsRunning = false;
          this.isUnivariateStatisticsResultAvailable = true;

          let {
            output,
            question,
            basetable
          } = response.message;

          this.baseTable = basetable;
          this.univariateStatisticsResult = output;

          //Get First Record to find out the attribute of json
          let firstRecord = {};
          if (output && output.length != 0) {
            firstRecord = output[0];
          }

          this.univariateStatisticsResultAttr = Object.keys(firstRecord);

          this.questions.q2 = {
            qname: question.name,
            options: question.options
          }
        },
        error: (error) => {
          this.isUnivariateStatisticsRunning = false;
          this.isUnivariateStatisticsResultAvailable = true;
          this.handleError(error);
        },
      });
  };


  //performAutomatedDT
  performAutomatedDT = (val: String) => {
    switch (val) {
      case 'Y':
        console.log('Yes Clicked');
        this.isAutomatedDT = true;

        this.vantageService.getQuestion(2).subscribe({
          next: response => {
            let { question, option } = response.message;
            this.questions.q3 = {
              qname: question,
              options: option
            }
          },
          error: error => {
            this.handleError(error);
          }
        });

        break;

      case 'N':
        console.log('No Clicked');
        this.isAutomatedDT = false;
        break;
    }
  };

  //Perform Numeric to Categorical
  performNumericToColumn = (val: string) => {
    switch (val) {
      case 'Y':
        console.log('Yes Clicked');
        this.isNumericToCategorical = true;
        break;
      case 'N':
        console.log('No Clicked');
        this.isNumericToCategorical = false;
        break;
    }
  }

  //Select Numerical Column that you would like to convert into Categorical
  selectNColumnToCConversion = (x: any) => {
    let isMatchFound = false;
    for (let i = 0; i < this.selectedNColumnsForConversionList.length; i++) {
      if (x === this.selectedNColumnsForConversionList[i]) {
        isMatchFound = true;
        break;
      }
    }
    if (!isMatchFound) {
      this.selectedNColumnsForConversionList.push(x);
    }
  };
  removeNSelectedItem = (item: any) => {
    for (let i = 0; i < this.selectedNColumnsForConversionList.length; i++) {
      if (item === this.selectedNColumnsForConversionList[i]) {
        this.selectedNColumnsForConversionList.splice(i, 1);
        break;
      }
    }
  }
  onNumericalCheckBoxSelect = (val: string, target: any) => {
    let isChecked: boolean = target.checked;
    if (isChecked) {
      this.selectNColumnToCConversion(val);
    } else {
      this.removeNSelectedItem(val);
    }
  }

  //Get Remaining Numerical and Categorical Colums
  getRemainingCols = (type: string) => {
    let fullList = [];
    let remainingItemInList = [];
    switch (type) {
      case "Num": {
        fullList = this.ncols;
        break;
      }
      case "Cat": {
        fullList = this.ccols;
        break;
      }
      default:
        fullList = this.columns
    }

    for (let n = 0; n < fullList.length; n++) {
      let matchFound = false;
      for (let d = 0; d < this.dropCols.length; d++) {
        if (fullList[n] === this.dropCols[d]) {
          matchFound = true;
          break;
        }
      }
      if (!matchFound) {
        remainingItemInList.push(fullList[n])
      }
    }

    return remainingItemInList;
  }

  // Configuration File upload
  onChange(event: any) {
    this.file = event.target.files[0];
    this.filename = event.target.files[0].name;
  }

  //Upload the config.txt file
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

  //Clear the State
  clear = () => {
    this.selectedDb = '';
    this.selectedtable = '';
    this.selectedColumn = '';

    this.tables = ['Select Table'];
    this.columns = ['Select Column'];

    this.inprogress = false;
    this.loading = false;
    this.isFileUploadFailed = false;
    this.questions = questions;
    this.isColumnSelectToDrop = false;
    this.dropCols = [];
    this.remainingCols = [];
    this.isFeatureContinue = false;
    this.isUnivariateStatisticsRunning = false;
    this.isUnivariateStatisticsResultAvailable = false;
    this.isAutomatedDT = false;
    this.univariateStatisticsResult = [];
    this.univariateStatisticsResultAttr = [];
    this.baseTable = "";
    this.dependentCol = "";
    this.remainingNcols = [];
    this.remainingCCols = [];
    this.isNumericToCategorical = false;
    this.selectedNColumnsForConversionList = [];
  };

  //Restart of Model Build
  restartProcess = () => {
    this.clear();
    this.initRunMessage = '';
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
