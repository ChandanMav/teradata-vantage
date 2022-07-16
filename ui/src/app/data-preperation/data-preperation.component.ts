import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  loading: boolean = false; // Flag variable
  file: File; // Variable to store file
  filename: String = "Choose file";
  fileuploadErrorMsg: string = "";
  message: string = "";


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
        this.databases = response.databases;
      },
      error: error => {
        //console.log(error);
        // if (error.error_code === "No_database_Session") {
        //   this.router.navigate(['/connection'], {
        //     relativeTo: this.activatedRoute,
        //   });
        // }
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
            this.tables = response.tables;
          },
          error: error => {
            //console.log(error);
            if (error.error_code === "No_database_Session") {
              this.router.navigate(['/connection'], {
                relativeTo: this.activatedRoute,
              });
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
            this.columns = response.colums;
          },
          error: error => {
            //console.log(error);
            if (error.error_code === "No_database_Session") {
              this.router.navigate(['/connection'], {
                relativeTo: this.activatedRoute,
              });
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
    this.vantageService.init(this.config, this.selectedDb, this.selectedtable, this.selectedColumn).subscribe({
      next: response => {
        console.log(response);
      },
      error: error => {
        //console.log(error);
        if (error.error_code === "No_database_Session") {
          this.router.navigate(['/connection'], {
            relativeTo: this.activatedRoute,
          });
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
    this.fileuploadErrorMsg = "";
    this.message = "";
    //console.log(this.file);
    this.fileUploadService.upload(this.file).subscribe({
      next: (data) => {
        this.fileuploadErrorMsg = "";
        this.loading = false;
        this.message = data.message;
        this.filename = "Choose file";
      },
      error: (error) => {
        this.fileuploadErrorMsg = error.message;
        this.loading = false;
        this.filename = "Choose file";
      }
    });
  }
}
