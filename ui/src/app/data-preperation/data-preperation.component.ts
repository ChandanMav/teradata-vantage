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
  styleUrls: ['./data-preperation.component.css']
})
export class DataPreperationComponent implements OnInit, AfterViewInit, OnDestroy {
  config: Connection;
  databases: String[] = ["Select Database"];
  tables: String[] = ["Select Table"];
  columns: String[] = ["Select Column"];

  selectedDb: String = "";
  selectedtable: String = "";
  selectedColumn: String = "";

  inprogress: boolean = false;
  loading: boolean = false;
  file: File; // Variable to store file
  filename: String = "Choose file";
  message: string = "";
  errorMsg: string = "";
  isTeradataConnectionAlive:boolean = false;
  initRunMessage:string = "";
  isFileUploadFailed:boolean = false;

  rowCount:number = 0;
  testsetsize:number = 0;
  top5data:any = [];
  ncols:String[] = [];
  ccols:String[] = [];




  constructor(private router: Router, private activatedRoute: ActivatedRoute, private vantageService: VantageService, private appService: AppService,
    private fileUploadService: FileUploadService) { }

  ngAfterViewInit(): void {
    this.appService.dataprepPage.next(true);
  }
  ngOnDestroy(): void {
    this.appService.dataprepPage.next(true);
  }

  ngOnInit(): void {
    let state = history.state;
    delete state["navigationId"];
    this.config = state;

    //console.log(this.config);
    this.vantageService.getDatabases(this.config).subscribe({
      next: response => {
        //console.log(response);
        this.errorMsg = "";
        this.isTeradataConnectionAlive = true;
        this.databases = response.databases;
        //this.database_bkp = response.database
      },
      error: error => {
        //console.log(error);
        if (error.error_code === GlobalConstants.No_db_Session) {
          this.clear();
          this.isTeradataConnectionAlive = false;
          this.errorMsg = "Please connect to Teradata Server First!";
          setTimeout(() => {
            this.router.navigate(['/connection'], {
              relativeTo: this.activatedRoute,
            });
          }, 4000);
        }
      }
    })
  }

  changeDropdown(x: any, type: String) {
    switch (type) {
      case "database":
        this.selectedDb = x.value;
        this.tables = ["Select Table"];
        this.columns = ["Select Column"];
        this.selectedtable = "";
        this.selectedColumn = "";
        this.vantageService.getTables(this.config, this.selectedDb).subscribe({
          next: response => {
            // console.log(response);
            this.errorMsg = "";
            this.isTeradataConnectionAlive = true;
            this.tables = response.tables;
          },
          error: error => {
            if (error.error_code === GlobalConstants.No_db_Session) {
              this.errorMsg = "Please connect to Teradata Server First!";
              this.isTeradataConnectionAlive = false;
              this.clear();
              setTimeout(() => {
                this.router.navigate(['/connection'], {
                  relativeTo: this.activatedRoute,
                });
              }, 4000);
            }
          }
        })
        break;
      case "table":
        this.selectedtable = x.value;
        this.columns = ["Select Column"];
        this.selectedColumn = "";

        this.vantageService.getColumns(this.config, this.selectedDb, this.selectedtable).subscribe({
          next: response => {
            //console.log(response);
            this.errorMsg = "";
            this.isTeradataConnectionAlive = true;
            this.columns = response.colums;
          },
          error: error => {
            if (error.error_code === GlobalConstants.No_db_Session) {
              this.errorMsg = "Please connect to Teradata Server First!";
              this.isTeradataConnectionAlive = false;
              this.clear();
              setTimeout(() => {
                this.router.navigate(['/connection'], {
                  relativeTo: this.activatedRoute,
                });
              }, 4000);
            }
          }
        })
        break;
      case "column":
        this.selectedColumn = x.value;
        break;
    }
  }

  init = () => {
    this.inprogress = true;
    this.isTeradataConnectionAlive = true;
    this.message = "";
    this.vantageService.init(this.config, this.selectedDb, this.selectedtable, this.selectedColumn).subscribe({
      next: response => {
        this.inprogress = false;
        this.errorMsg = "";
        this.initRunMessage = "Below are basic finding.."
        console.log(response);

        let {rowCount, testsetsize, top5data, ncols, ccols} = response.message;
        this.rowCount = rowCount;
        this.testsetsize = testsetsize;
        this.top5data = top5data;
        this.ncols = ncols;
        this.ccols = ccols;
      },
      error: error => {
        //console.log(error);
        this.inprogress = false;
        switch (error.error_code) {
          case GlobalConstants.No_Config_File:
            this.errorMsg = "The configuration file is missing. Please upload that first!"
            this.clear();
            break;
          case GlobalConstants.Config_File_Incorrect_Format:
            this.errorMsg = "The configuration file is in incorrect format. Please uplaod correct one!"
            this.clear();
            break;
          case GlobalConstants.Missing_Required_Input:
            this.errorMsg = "Some data are missing while requesting. Please contact with system administrator!"
            this.clear();
            break;
          case GlobalConstants.No_db_Session:
            this.errorMsg = "Please connect to teradata server";
            this.isTeradataConnectionAlive = false;
            this.clear();
            setTimeout(() => {
              this.router.navigate(['/connection'], {
                relativeTo: this.activatedRoute,
              });
            }, 4000)
            break;
          case GlobalConstants.Error_500:
            this.errorMsg = "There is some server errors. Please try after sometime!";
            this.clear();
            break;
          default:
            this.errorMsg = "Some error occured. Please start from begining!";
            this.clear();
            setTimeout(() => {
              this.router.navigate(['/connection'], {
                relativeTo: this.activatedRoute,
              });
            }, 4000)
        }
      }
    })
  }

  // On file Select
  onChange(event: any) {
    this.file = event.target.files[0];
    this.filename = event.target.files[0].name;
  }


  upload = () => {
    this.loading = !this.loading;

    //console.log(this.file);
    this.fileUploadService.upload(this.file).subscribe({
      next: (data) => {
        this.isFileUploadFailed = false;
        this.loading = false;
        this.message = data.message;
        this.filename = "Choose file";

      },
      error: (error) => {
        this.isFileUploadFailed = true;
        this.message = "Not uploaded. Pls. retry with correct file!";
        this.loading = false;
        this.filename = "Choose file";
      }
    });
  }

  clear = () => {
    this.selectedDb = "";
    this.selectedtable = "";
    this.selectedColumn = "";

    this.tables = ["Select Table"];
    this.columns = ["Select Column"];


    this.inprogress = false;
    this.loading = false;
    this.isFileUploadFailed = false;
  }

  restartProcess = () => {
    this.clear();
    this.initRunMessage = "";
    //this.databases = this.database_bkp;
  }
}
