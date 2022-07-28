import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GlobalConstants } from '../global-constants';
import { AppService } from '../service/common/app.service';
import { FileUploadService } from '../service/file-upload.service';
import { VantageService } from '../service/vantage.service';
import { Connection } from '../shared/connection';
import { questions } from '../shared/question'
declare var $: any;

interface PendingCatSelection {
  [key: string]: boolean;
}

interface PendingNumSelection {
  [key: string]: boolean;
}

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
  columnsWTDependentCol: string[] = [];

  selectedDb: string = ''; //DB Name from left side dropdown
  selectedtable: string = ''; //Table Name from left side dropdown
  selectedColumn: string = ''; //Depenedent Column Name from left side dropdown

  baseTable: string = "";
  dependentCol: string = "";

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
  displayCols: any = [];
  ncols: string[] = [];
  ccols: string[] = [];

  questions: any = questions;
  isColumnSelectToDrop: boolean = false;
  dropCols: string[] = [];
  remainingCols: string[] = []; //It will not contain Dependent column
  remainingNcols: string[] = [];
  remainingCCols: string[] = [];

  isFeatureContinue: boolean = false;
  isUnivariateStatisticsRunning: boolean = false;
  isUnivariateStatisticsResultAvailable: boolean = false;
  isAutomatedDT: boolean = false;
  isManualDT: boolean = false;
  univariateStatisticsResult = [];
  univariateStatisticsResultAttr: string[] = [];



  //Automated DT Control
  allAutomatedDTSteps: any[] = [];
  isAutomatedProceed: boolean = false;

  //Manual DT
  manualDataTransformationMessage = "";
  manualDataTransformDecision: boolean = false;
  manualDataTransformDecisionInString: string = "";

  //Numerical To Categorical Controls
  selectedNColumnsForConversionList: string[] = [];
  tempRemainingNcols: any[] = [];
  isNumericToCategoricalPerform: boolean = false;
  isNumricalToCategoricalStarted: boolean = false;
  isNumricalToCategoricalConversionDone: boolean = false;
  newCategoricalColumnsList: string[] = [];
  newNumericalColumnsList: string[] = [];
  newBaseTable: string = "";


  //Null Basic Imputing Controls
  isBasicNullPerform: boolean = false;
  isBasicNullImputingStarted: boolean = false;
  isBasicNullImputingDone: boolean = false;
  allColumnWithCheckedStatusFromBasicNullOps: any[] = [];
  basicNullValueImputingList: string[] = []


  //Automated Cluster Controls
  isAutomatedClusterPerform: boolean = false;
  isAutomatedClusterStarted: boolean = false;
  isAutomatedClusterDone: boolean = false;
  numericalPendingSelection: PendingNumSelection = Object.create(null);
  categoricalPendingSelection: PendingCatSelection = Object.create(null);
  selectedColsForClusterImputing: string[] = [];
  pairs: any[] = []

  //Outlier Controls
  isOutlierHandingPerform: boolean = false;
  isOutlierHandingStarted: boolean = false;
  isOutlierHandingDone: boolean = false;
  flows: any = [];

  //Final Model
  finalBuildModelStart: boolean = false;
  finalBuildModelDone: boolean = false;
  modelresult: any[] = [];


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
    //TBD
    this.config = state;
    // this.config = {
    //   host: "153.64.73.11",
    //   user: "CDMTDF3",
    //   password: "Migrate1234#"
    // };

    this.vantageService.getDatabases(this.config).subscribe({
      next: (response) => {
        this.errorMsg = '';
        this.isTeradataConnectionAlive = true;
        this.databases = response.databases;
        //this.database_bkp = response.database
      },
      error: (error) => {
        if (error.error_code === GlobalConstants.No_db_Session) {
          this.clear();
          this.isTeradataConnectionAlive = false;
          this.errorMsg = 'Please connect to Server!';
          setTimeout(() => {
            this.router.navigate(['/connection'], {
              relativeTo: this.activatedRoute,
            });
          }, 4000);
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
        this.columnsWTDependentCol = [];
        for (let c = 0; c < this.columns.length; c++) {
          if (this.columns[c] === this.dependentCol) {
            continue;
          }
          this.columnsWTDependentCol.push(this.columns[c]);
        }
        break;
    }
  }

  //Get Basic Info
  init = () => {
    this.inprogress = true;
    this.isTeradataConnectionAlive = true;
    // this.message = '';
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
          this.displayCols = Object.keys(top5data[0]);


          this.ncols = ncols;
          this.ccols = ccols;
          this.trainsetsize = trainsetsize;

          this.remainingNcols = [...this.ncols];
          this.remainingCCols = [...this.ccols];

          this.questions.q1 = {
            qname: question.name,
            options: question.options
          }

          //TBD
          // this.newCategoricalColumnsList = ['dataplan', 'ContractRenewal'];
          // this.newNumericalColumnsList = [...ncols];
        },
        error: (error) => {
          this.clear();
          this.handleError(error);
        },
      });

  };


  //Remove Column from Model Decision
  deleteColumnDecision = (val: String) => {
    this.clearDataAttributeSelectionState();
    this.isFeatureContinue = true;
    switch (val) {
      case 'Y':
        this.addRemainingItem(); //Setting initail N, C, All columns list. Will not contain Dependent Column
        this.isColumnSelectToDrop = true; //This is for radio Yes, No on Data Attribute Selection
        break;

      case 'N':
        this.isColumnSelectToDrop = false;
        this.dropCols = [];
        this.remainingCols = [...this.columns];
        this.remainingNcols = [...this.ncols];
        this.remainingCCols = [...this.ccols];
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
   3. Change the base table if yes
   4. Perform Univariate Statistics
  */
  performUnivariateStatistics = () => {
    this.clearDataAttributeSelectionState();
    this.isUnivariateStatisticsRunning = true;
    this.isUnivariateStatisticsResultAvailable = false;
    let key: string = this.dropCols.length === 0 ? "N" : "Y";
    let temp = this.remainingCols;
    temp.push(this.dependentCol)

    // console.log("All Column List", this.columns)
    // console.log("Drop Column List", this.dropCols);
    // console.log("All remaining Column List", this.remainingCols);
    // console.log("Remaining Numerical Column List", this.remainingNcols);
    // console.log("Remaining Categorical Column List", this.remainingCCols);


      this.vantageService
      .performUnivariateStatistics(
        this.config,
        this.selectedDb,
        this.selectedtable,
        this.dependentCol,
        temp,
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
          this.isUnivariateStatisticsResultAvailable = false;
          this.handleError(error);
        },
      });

  }; //End Data Attribute Selection


  //Perform Automated Data Transformation
  performAutomatedDT = (val: String) => {
    this.clearAutomatedDataTransferState();
    this.isAutomatedDT = false;
    this.isManualDT = false;
    switch (val) {
      case 'Y':
        this.vantageService.getAllAutomatedDTSteps().subscribe({
          next: response => {
            //console.log(response);
            this.allAutomatedDTSteps = response.message.questions;
            this.isAutomatedDT = true;
            this.isManualDT = false;
          },
          error: error => {
            this.handleError(error);
            this.isAutomatedDT = true;
            this.isManualDT = false;
          }
        });
        break;
      case 'N':
        this.vantageService.getQuestion(4).subscribe({
          next: response => {
            let { question, option } = response.message;
            this.questions.q4 = {
              qname: question,
              options: option
            }
            this.isAutomatedDT = false;
            this.clearAutomatedDataTransferState();
            this.isManualDT = true;

          },
          error: error => {
            this.handleError(error);
            this.isAutomatedDT = false;
            this.clearAutomatedDataTransferState();
            this.isManualDT = true;
          }
        });
        break;
    }
  }

  automatedDTProceed = () => {
    this.clearAutomatedDataInfoState();
    this.isAutomatedProceed = false;
    this.vantageService.getQuestion(2).subscribe({
      next: response => {
        let { question, option } = response.message;
        this.questions.q6 = {
          qname: question,
          options: option
        }
        this.isAutomatedProceed = true;
      },
      error: error => {
        this.handleError(error);
        this.isAutomatedProceed = true;
      }
    });
  }

  /*
   1. Create _categ Table
   2. Change the base table to (_categ or _work ) depends on the selection
  */
  //Perform Numeric to Categorical - 6 //Decision
  performNumericToColumn = (val: string) => {
    this.clearNumericalToCategoricalState();
    this.isNumericToCategoricalPerform = false;
    //Prepare for checkbox two data modeling
    let d = [];
    for (let n = 0; n < this.remainingNcols.length; n++) {
      let obj = { name: this.remainingNcols[n], checked: false }
      d.push(obj);
    }
    this.tempRemainingNcols = d;

    switch (val) {
      case 'Y':
        this.isNumericToCategoricalPerform = true;
        this.isNumricalToCategoricalConversionDone = false;
        //Chnage the base table name
        this.newBaseTable = this.selectedtable + "_categ";
        break;
      case 'N':
        this.newBaseTable = this.baseTable;
        this.vantageService
          .getQuestion(7)
          .subscribe({
            next: response => {
              this.isNumericToCategoricalPerform = false;
              this.isNumricalToCategoricalConversionDone = true;
              let { question, option } = response.message;

              this.questions.q7 = {
                qname: question,
                options: option
              }
            },
            error: error => {
              this.isNumericToCategoricalPerform = false;
              this.isNumricalToCategoricalConversionDone = true;
              this.handleError(error);
            }
          });

        this.selectedNColumnsForConversionList = [];
        this.newCategoricalColumnsList = [...this.remainingCCols];
        this.newNumericalColumnsList = [...this.remainingNcols];
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
    this.toggleCheckedStatus(item, false);

  }
  onNumericalCheckBoxSelect = (val: string, target: any) => {
    let isChecked: boolean = target.checked;
    if (isChecked) {
      this.selectNColumnToCConversion(val);
    } else {
      this.removeNSelectedItem(val);
    }
    this.toggleCheckedStatus(val, isChecked);
  }



  toggleCheckedStatus = (val: any, isChecked: boolean) => {
    for (let i = 0; i < this.tempRemainingNcols.length; i++) {
      let { name, checked } = this.tempRemainingNcols[i]
      if (name === val) {
        this.tempRemainingNcols[i].checked = isChecked;
        break;
      }
    }
  }

  performNumericalToCategorical = () => { //Set Question 7
    this.clearNumericalToCategoricalState();
    this.isNumricalToCategoricalStarted = true;
    this.isNumricalToCategoricalConversionDone = false;

    this.vantageService
      .convertNumericalToCategorical(
        this.config,
        this.selectedDb,
        this.baseTable,
        this.newBaseTable,
        this.selectedNColumnsForConversionList
      )
      .subscribe({
        next: (response) => {
          this.isNumricalToCategoricalStarted = false;
          this.isNumricalToCategoricalConversionDone = true;

          //Update New Categorical and Numerical Column List
          let newCategoricalColumnsList = [...this.remainingCCols];
          let newNumericalColumnsList = [...this.remainingNcols];

          //Add to categorical list
          //console.log("this.selectedNColumnsForConversionList ", this.selectedNColumnsForConversionList)
          //console.log("newCategoricalColumnsList ", newCategoricalColumnsList)
          for (let e = 0; e < this.selectedNColumnsForConversionList.length; e++) {
            let matchFound = false;
            for (let t = 0; t < newCategoricalColumnsList.length; t++) {
              if (newCategoricalColumnsList[t] === this.selectedNColumnsForConversionList[e]) {
                matchFound = true;
                break;
              }
            }
            if (!matchFound) {
              //console.log("Inside Match Found");
              newCategoricalColumnsList.push(this.selectedNColumnsForConversionList[e]);
            }
          }

          //Remove From Numerical list
          for (let i = 0; i < this.selectedNColumnsForConversionList.length; i++) {
            let index = newNumericalColumnsList.indexOf(this.selectedNColumnsForConversionList[i]);
            if (index !== -1) {
              newNumericalColumnsList.splice(index, 1);
            }
          }

          //Set to instance variable
          this.newCategoricalColumnsList = newCategoricalColumnsList;
          this.newNumericalColumnsList = newNumericalColumnsList;

          //console.log(this.newCategoricalColumnsList);
          //console.log(this.newNumericalColumnsList);

          let {
            output,
            question
          } = response.message;

          console.log(question);

          this.questions.q7 = {
            qname: question.name,
            options: question.options
          }
        },
        error: (error) => {
          this.isNumricalToCategoricalStarted = false;
          this.isNumricalToCategoricalConversionDone = true;
          this.newCategoricalColumnsList = [...this.remainingCCols];
          this.newNumericalColumnsList = [...this.remainingNcols];
          this.handleError(error);
        },
      });

  }




  //Perform Basic Null Value Imputing - Html 7
  performBasicNullDecision = (val: string) => {
    this.clearBasicNullImputingState();
    this.isBasicNullPerform = false;
    this.isBasicNullImputingDone = false;

    let d = [];
    for (let n = 0; n < this.remainingNcols.length; n++) {
      let obj = { name: this.remainingNcols[n], checked: false }
      d.push(obj);
    }
    for (let n = 0; n < this.remainingCCols.length; n++) {
      let obj = { name: this.remainingCCols[n], checked: false }
      d.push(obj);
    }

    this.allColumnWithCheckedStatusFromBasicNullOps = d;

    switch (val) {
      case 'Y':
        this.isBasicNullPerform = true;
        this.isBasicNullImputingDone = false;
        break;
      case 'N':
        this.vantageService
          .getQuestion(8)
          .subscribe({
            next: response => {
              this.isBasicNullPerform = false;
              this.isBasicNullImputingDone = true;
              let { question, option } = response.message;

              this.questions.q8 = {
                qname: question,
                options: option
              }
            },
            error: error => {
              this.isBasicNullPerform = false;
              this.isBasicNullImputingDone = true;
              this.handleError(error);
            }
          });
        this.basicNullValueImputingList = [];
        this.numericalPendingSelection = Object.create(null);
        this.categoricalPendingSelection = Object.create(null);
        this.selectedColsForClusterImputing = [];
        break;
    }
  }

  onBasicNullCheckBoxSelect = (val: string, target: any) => {
    let isChecked: boolean = target.checked;
    if (isChecked) {
      this.addToBasicNullValueImputingList(val);
    } else {
      this.removeToBasicNullValueImputingList(val);
    }
    this.toggleBasicNullCheckedStatus(val, isChecked);
  }

  addToBasicNullValueImputingList = (item: string) => {
    let isMatchFound = false;
    for (let i = 0; i < this.basicNullValueImputingList.length; i++) {
      if (item === this.basicNullValueImputingList[i]) {
        isMatchFound = true;
        break;
      }
    }
    if (!isMatchFound) {
      this.basicNullValueImputingList.push(item);
    }
  }

  removeToBasicNullValueImputingList = (item: string) => {
    for (let i = 0; i < this.basicNullValueImputingList.length; i++) {
      if (item === this.basicNullValueImputingList[i]) {
        this.basicNullValueImputingList.splice(i, 1);
        break;
      }
    }
    this.toggleBasicNullCheckedStatus(item, false);
  }

  toggleBasicNullCheckedStatus = (val: string, isChecked: boolean) => {
    for (let i = 0; i < this.allColumnWithCheckedStatusFromBasicNullOps.length; i++) {
      let { name, checked } = this.allColumnWithCheckedStatusFromBasicNullOps[i]
      if (name === val) {
        this.allColumnWithCheckedStatusFromBasicNullOps[i].checked = isChecked;
        break;
      }
    }
  }

  onBasicNullValueCheckBoxSelect = (val: string, target: any) => {
    let isChecked: boolean = target.checked;
    if (isChecked) {
      this.addToBasicNullValueImputingList(val);
    } else {
      this.removeToBasicNullValueImputingList(val);
    }
    this.toggleBasicNullCheckedStatus(val, isChecked);
  }

  performBasicNullImputing = () => {
    this.clearBasicNullImputingState();
    this.isBasicNullImputingStarted = true;
    this.isBasicNullImputingDone = false;

    let d = [];
    for (let i = 0; i < this.basicNullValueImputingList.length; i++) {
      let item: any = {};
      if (this.newNumericalColumnsList.includes(this.basicNullValueImputingList[i])) {
        for (let u = 0; u < this.univariateStatisticsResult.length; u++) {
          let obj: any = this.univariateStatisticsResult[u];
          if ((obj['Attribute']).toUpperCase() === this.basicNullValueImputingList[i].toUpperCase()) {
            item.name = this.basicNullValueImputingList[i].toLowerCase();
            item.value = obj['Median'];
            break;
          }
        }
      } else {
        for (let u = 0; u < this.univariateStatisticsResult.length; u++) {
          let obj: any = this.univariateStatisticsResult[u];
          if ((obj['Attribute']).toUpperCase() === this.basicNullValueImputingList[i].toUpperCase()) {
            item.name = this.basicNullValueImputingList[i].toLowerCase();
            item.value = obj['Mode'];
            break;
          }
        }
      }
      d.push(item);
    }

    this.vantageService
      .performBasicNullImputingServc(
        this.config,
        this.selectedDb,
        this.newBaseTable,
        d
      )
      .subscribe({
        next: (response) => {
          this.isBasicNullImputingStarted = false;
          this.isBasicNullImputingDone = true;

          let {
            output,
            question
          } = response.message;

          this.questions.q8 = {
            qname: question.name,
            options: question.options
          }

          this.numericalPendingSelection = Object.create(null);
          this.categoricalPendingSelection = Object.create(null);
          this.selectedColsForClusterImputing = [];
        },
        error: (error) => {
          this.isBasicNullImputingStarted = false;
          this.isBasicNullImputingDone = true;
          this.numericalPendingSelection = Object.create(null);
          this.categoricalPendingSelection = Object.create(null);
          this.selectedColsForClusterImputing = [];
          this.handleError(error);
        },
      });
  }

  //Perform Cluster Null Value Imputing //Question 8 -- Set Question 9
  performClusterNullValueImputingDecision = (val: string) => {
    this.clearClusteredImputingState();
    this.isAutomatedClusterPerform = false;
    this.isAutomatedClusterDone = false;
    this.pairs = [];
    switch (val) {
      case 'Y':
        this.isAutomatedClusterPerform = true;
        this.isAutomatedClusterDone = false;
        break;
      case 'N':
        this.vantageService
          .getQuestion(9)
          .subscribe({
            next: response => {
              this.isAutomatedClusterPerform = false;
              this.isAutomatedClusterDone = true;
              let { question, option } = response.message;

              this.questions.q9 = {
                qname: question,
                options: option
              }
            },
            error: error => {
              this.isAutomatedClusterPerform = false;
              this.isAutomatedClusterDone = true;
              this.handleError(error);
            }
          });
        break;
    }
  }

  performClusterNullValueImputing = () => {
    this.clearClusteredImputingState();
    this.isAutomatedClusterStarted = true;
    this.isAutomatedClusterDone = false;
    //TBD
    //this.newBaseTable = "cellphone_work";
    this.vantageService
      .performClusterNullValueImputingSrvc(
        this.config,
        this.selectedDb,
        this.newBaseTable,
        this.pairs
      )
      .subscribe({
        next: (response) => {
          this.isAutomatedClusterStarted = false;
          this.isAutomatedClusterDone = true;
          let {
            output,
            question
          } = response.message;

          this.questions.q9 = {
            qname: question.name,
            options: question.options
          }
        },
        error: (error) => {
          this.isAutomatedClusterStarted = false;
          this.isAutomatedClusterDone = true;
          this.handleError(error);
        },
      });
  }


  // Toggle the pending selection for the given numerical column.
  public toggleNumericalPendingSelection(col: string): void {
    this.numericalPendingSelection[col] = !this.numericalPendingSelection[col];
  }

  // Toggle the pending selection for the given categorical column.
  public toggleCategoricalPendingSelection(col: string): void {
    this.categoricalPendingSelection[col] = !this.categoricalPendingSelection[col];
  }

  private getSelectionFromCollection(collection: string[], category: string): string[] {
    let selectionFromCollection: string[] = [];
    if (category === "N") {
      selectionFromCollection = collection.filter(col => {
        if (this.numericalPendingSelection[col]) {
          return true;
        }
        return false;
      });
    } else if (category === 'C') {
      selectionFromCollection = collection.filter(col => {
        if (this.categoricalPendingSelection[col]) {
          return true;
        }
        return false;
      });
    }
    return selectionFromCollection;
  }


  makePair = () => {
    let numericalList = this.getSelectionFromCollection(this.newNumericalColumnsList, "N");
    let categoricalList = this.getSelectionFromCollection(this.newCategoricalColumnsList, "C");

    this.numericalPendingSelection = Object.create(null);
    this.categoricalPendingSelection = Object.create(null);

    let pair = [...categoricalList, ...numericalList];

    if (!this.isPairAvailablePairlist(pair)) {
      this.pairs.push(pair);
    }

  }

  updatePair = (ele1: any, ele2: any) => {
    let filteredPair = this.pairs.filter((pair: any[]) => {
      if (pair[0] === ele1 && pair[1] === ele2) {
        return false;
      }
      return true;
    })
    this.pairs = filteredPair;
  }

  isPairAvailablePairlist = (pair: string[]) => {
    return this.pairs.some(p => this.arraysEqual(p, pair));
  }

  isPairAvailableToAdd = (): boolean => {
    let numericalList = this.getSelectionFromCollection(this.newNumericalColumnsList, "N");
    let categoricalList = this.getSelectionFromCollection(this.newCategoricalColumnsList, "C");
    return numericalList.length > 0 && categoricalList.length > 0;
  }


  arraysEqual = (a: any[], b: any[]) => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    for (var i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }



  //Perform Outlier Handling - //Question 9 -- Set Question 10
  performOutlierHandlingDecision = (val: string) => {
    this.clearOutlierState();
    this.isOutlierHandingPerform = false;
    this.isOutlierHandingDone = false;
    switch (val) {
      case 'Y':
        this.isOutlierHandingPerform = true;
        this.isOutlierHandingDone = false;
        break;
      case 'N':
        this.vantageService
          .getModelBuildFlow()
          .subscribe({
            next: response => {
              this.isOutlierHandingPerform = false;
              this.isOutlierHandingDone = true;
              //console.log(response.message);
              this.flows = response.message.flows;
            },
            error: error => {
              this.isOutlierHandingPerform = false;
              this.isOutlierHandingDone = true;
              this.handleError(error);
            }
          });

        break;
    }
  }

  performOutlierHandling = () => {
    this.clearOutlierState();
    this.isOutlierHandingStarted = true;
    this.isOutlierHandingDone = false;

    this.vantageService
      .performOutlierHandlingSrvc(
        this.config,
        this.selectedDb,
        this.selectedtable,
        this.newBaseTable,
        this.newNumericalColumnsList
      )
      .subscribe({
        next: (response) => {
          this.isOutlierHandingStarted = false;
          this.isOutlierHandingDone = true;
          this.flows = response.message.flows;
        },
        error: (error) => {
          this.isOutlierHandingStarted = false;
          this.isOutlierHandingDone = true;
          this.handleError(error);
        },
      });

  }


  //Perform Manual Data Transform
  performManualDT = (val: String) => {
    this.clearManualDataTransformState();
    this.manualDataTransformDecision = false;
    this.manualDataTransformDecisionInString = "";
    switch (val) {
      case 'Y':
        this.manualDataTransformDecision = true;
        this.manualDataTransformDecisionInString = "Y";
        this.manualDataTransformationMessage = "Please re-run after manual Data Transformation, Thank You!"
        break;
      case 'N':
        this.manualDataTransformDecision = false;
        this.manualDataTransformationMessage = "Below is Final Model"
        this.vantageService
          .getModelBuildFlow()
          .subscribe({
            next: response => {
              this.manualDataTransformDecisionInString = "N";
              this.flows = response.message.flows;
            },
            error: error => {
              this.manualDataTransformDecisionInString = "N";
              this.handleError(error);
            }
          });
        break;
    }
    setTimeout(() => {
      this.router.navigate(['/'], {
        relativeTo: this.activatedRoute,
      });
    }, 4000);
  }

  //Model Build
  buildModel = () => {
    this.clearBuildModelState();
    this.finalBuildModelStart = true;
    this.finalBuildModelDone = false;
    this.vantageService
      .buildModel(
        this.config,
        this.selectedDb,
        this.selectedtable,
        this.trainsetsize,
        this.testsetsize,
        this.selectedColumn,
        this.newNumericalColumnsList,
        this.newCategoricalColumnsList,
        this.remainingCols
      )
      .subscribe({
        next: (response) => {

          this.modelresult = response.message;
          console.log(response.message);
          this.finalBuildModelStart = false;
          this.finalBuildModelDone = true;
        },
        error: (error) => {
          this.modelresult = [];
          this.finalBuildModelStart = false;
          this.finalBuildModelDone = true;
          this.handleError(error);
        },
      });
  }

  //Restart of Model Build
  restartProcess = () => {
    this.clear();
    this.initRunMessage = '';
  };

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
        fullList = this.columnsWTDependentCol
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

  clearDataAttributeSelectionState = () => {
    this.isUnivariateStatisticsRunning = false;
    this.isUnivariateStatisticsResultAvailable = false;
    this.univariateStatisticsResult = [];
    this.univariateStatisticsResultAttr = [];
    this.baseTable = this.selectedtable;
    this.clearAutomatedDataTransferState();

    //Reset decision flag
    this.isAutomatedDT = false;
    this.isManualDT = false;

  }

  clearAutomatedDataTransferState = () => {
    this.allAutomatedDTSteps = [];
    this.isAutomatedDT = false;
    this.isManualDT = false;
    this.clearAutomatedDataInfoState();

    //Reset decision flag
    this.isAutomatedProceed = false;
  }


  clearAutomatedDataInfoState = () => {
    this.isAutomatedProceed = false;
    this.clearNumericalToCategoricalState();

    //Reset next state flag
    this.isNumericToCategoricalPerform = false;
    this.tempRemainingNcols = [];
    this.isNumricalToCategoricalStarted = false;
    this.isNumricalToCategoricalConversionDone = false;
    this.selectedNColumnsForConversionList = [];
    this.newCategoricalColumnsList = [];
    this.newNumericalColumnsList = [];

  }

  clearNumericalToCategoricalState = () => {
    this.isNumricalToCategoricalStarted = false;
    this.isNumricalToCategoricalConversionDone = false;
    this.newCategoricalColumnsList = [];
    this.newNumericalColumnsList = [];
    this.clearBasicNullImputingState();

    //Reset next state flag
    this.isBasicNullPerform = false;
    this.isBasicNullImputingDone = false;
    this.isBasicNullImputingStarted = false;
    this.isBasicNullImputingDone = false;
    this.basicNullValueImputingList = [];
  }

  clearBasicNullImputingState = () => {
    this.isBasicNullImputingDone = false;
    this.isBasicNullImputingStarted = false;
    this.clearClusteredImputingState();

    //Reset next state flag
    this.isAutomatedClusterStarted = false;
    this.isAutomatedClusterDone = false;
    this.isAutomatedClusterStarted = false;
    this.isAutomatedClusterDone = false;
    this.numericalPendingSelection = Object.create(null);
    this.categoricalPendingSelection = Object.create(null);
    this.selectedColsForClusterImputing = [];

  }

  clearClusteredImputingState = () => {
    this.isAutomatedClusterStarted = false;
    this.isAutomatedClusterDone = false;
    this.clearOutlierState();

    //Reset next state flag
    this.isOutlierHandingPerform = false;
    this.isOutlierHandingDone = false;
    this.flows = [];
  }

  clearOutlierState = () => {
    this.isOutlierHandingStarted = false;
    this.isOutlierHandingDone = false;
    this.flows = [];

    this.clearManualDataTransformState();
    this.manualDataTransformDecision = false;
    this.manualDataTransformDecisionInString = "";

    this.clearBuildModelState();
    this.finalBuildModelStart = false;
    this.finalBuildModelDone = false;
    this.modelresult = [];
  }

  clearManualDataTransformState = () => {
    this.manualDataTransformDecisionInString = "";
    this.clearBuildModelState();

    //Reset next state flag
    this.finalBuildModelStart = false;
    this.finalBuildModelDone = false;
    this.modelresult = [];
  }

  clearBuildModelState = () => {
    this.finalBuildModelStart = false;
    this.finalBuildModelDone = false;
    this.modelresult = [];
  }

  //Clear the State
  clear = () => {
    this.selectedDb = '';
    this.selectedtable = '';
    this.selectedColumn = '';
    this.baseTable = "";
    this.dependentCol = "";
    this.tables = ['Select Table'];
    this.columns = ['Select Column'];
    this.columnsWTDependentCol = [];
    this.inprogress = false;
    this.loading = false;
    this.isFileUploadFailed = false;
    this.questions = questions;
    this.clearDataAttributeSelectionState();
  };


  //Error Handling
  handleError = (error: any) => {
    window.scrollTo(0, 0);
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

