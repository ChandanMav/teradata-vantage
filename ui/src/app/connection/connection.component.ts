import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AppService } from '../service/common/app.service';
import { ServerConnectionService } from '../service/server-connection-service.service';
import { Connection } from '../shared/connection';

@Component({
  selector: 'app-connection',
  templateUrl: './connection.component.html',
  styleUrls: ['./connection.component.css'],
})
export class ConnectionComponent implements OnInit, AfterViewInit, OnDestroy {
  public frmRegister: FormGroup;
  submitted = false;
  isFormError: boolean;
  formInitialValues: any;
  message: string = "";
  conn_status: boolean = false;
  countdown: number = 1;
  interval: any;

  constructor(
    private serverConnectionService: ServerConnectionService,
    private _fb: FormBuilder,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private appService: AppService
  ) { }

  ngOnInit(): void {
    this.frmRegister = this._fb.group({
      host: ['', [Validators.required]],
      user: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });

    this.formInitialValues = this.frmRegister.value;
    this.appService.dataprepPage.next(false);
  }

  ngOnDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }

    this.appService.connectionPage.next(false);
  }
  ngAfterViewInit(): void {
    this.appService.connectionPage.next(true);

  }

  testServerConnection(value: Connection) {
    this.message = '';
    this.submitted = true;
    this.conn_status = false;
    this.serverConnectionService
      .testServerConnection(value)
      .subscribe({
        next: (response) => {
          this.conn_status = true;
          this.submitted = false;
          this.message = response.message;
          this.interval = setInterval(() => {
            if (this.countdown === 0) {
              this.router.navigate(['/mdlbuild'], {
                relativeTo: this.activatedRoute,
                state: value
              });
            }
            this.countdown = this.countdown - 1;
          }, 1000);
        },
        error: (e) => {
          this.conn_status = false;
          this.submitted = false;
          console.log(e);
          if(e.type === "error"){
            this.message ="Couldn't able to establish connection with server. Please Retry!"
          }else{
            this.message = e.message;
          }


          this.clear();
        }
      });
  }

  //convenience getter for easy access to form fields
  get f(): { [key: string]: AbstractControl } {
    return this.frmRegister.controls;
  }

  clear() {
    this.frmRegister.reset(this.formInitialValues);
    this.submitted = false;
    this.conn_status = false;
  }
}
