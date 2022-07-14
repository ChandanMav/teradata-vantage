import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  conn_status:boolean = false;

  constructor(
    private serverConnectionService: ServerConnectionService,
    private _fb: FormBuilder,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.frmRegister = this._fb.group({
      host: ['', [Validators.required]],
      user: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });

    this.formInitialValues = this.frmRegister.value;
  }

  ngOnDestroy(): void {
    console.log('Method not implemented.');
  }
  ngAfterViewInit(): void {
    console.log('Method not implemented.');
  }

  testServerConnection(value: Connection) {
    this.message = '';
    this.submitted = true;
    this.serverConnectionService
      .testServerConnection(value)
      .subscribe({
        next: (response) => {
          this.conn_status = true;
          this.submitted = false;
          this.message = response.message;
        },
        error: (e) => {
          this.conn_status = false;
          this.submitted = false;
          this.message = e;
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
