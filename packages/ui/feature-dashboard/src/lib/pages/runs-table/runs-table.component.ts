import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  ApEdition,
  FlowRunStatus,
  FlowId,
  FlowRetryStrategy,
  FlowRun,
  NotificationStatus,
  ProjectId,
  SeekPage,
} from '@activepieces/shared';
import { ActivatedRoute } from '@angular/router';
import {
  combineLatest,
  distinctUntilChanged,
  map,
  Observable,
  shareReplay,
  startWith,
  Subject,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { RunsTableDataSource } from './runs-table.datasource';
import {
  InstanceRunService,
  ApPaginatorComponent,
  FlagService,
  NavigationService,
  AuthenticationService,
  FlowService,
  FLOW_QUERY_PARAM,
  STATUS_QUERY_PARAM,
  DATE_RANGE_END_QUERY_PARAM,
  DATE_RANGE_START_QUERY_PARAM,
  ProjectService,
} from '@activepieces/ui/common';
import { FormControl, FormGroup } from '@angular/forms';
import { RunsService } from '../../services/runs.service';
import { DropdownOption } from '@activepieces/pieces-framework';
const allOptionValue = 'all';
@Component({
  templateUrl: './runs-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RunsTableComponent implements OnInit {
  @ViewChild(ApPaginatorComponent, { static: true })
  paginator!: ApPaginatorComponent;
  readonly allOptionValue = allOptionValue;
  runsPage$: Observable<SeekPage<FlowRun>>;
  searchControl: FormControl<string> = new FormControl('', {
    nonNullable: true,
  });
  nonCommunityEdition$: Observable<boolean>;
  toggleNotificationFormControl: FormControl<boolean> = new FormControl();
  dataSource!: RunsTableDataSource;
  displayedColumns = ['flowName', 'status', 'started', 'finished', 'action'];
  updateNotificationsValue$: Observable<unknown>;
  refreshTableForReruns$: Subject<boolean> = new Subject();
  statusFilterControl: FormControl<FlowRunStatus | typeof allOptionValue> =
    new FormControl(allOptionValue, { nonNullable: true });
  flowFilterControl = new FormControl<string>(allOptionValue, {
    nonNullable: true,
  });
  dateFormGroup = new FormGroup({
    start: new FormControl(),
    end: new FormControl(),
  });
  selectedFlowName$: Observable<string | undefined>;
  flows$: Observable<DropdownOption<FlowId>[]>;
  currentProject: ProjectId;
  filtersChanged$: Observable<void>;
  readonly ExecutionOutputStatus = FlowRunStatus;
  FlowRetryStrategy: typeof FlowRetryStrategy = FlowRetryStrategy;
  retryFlow$?: Observable<void>;
  setInitialFilters$?: Observable<void>;
  constructor(
    private activatedRoute: ActivatedRoute,
    private flagsService: FlagService,
    private projectService: ProjectService,
    private instanceRunService: InstanceRunService,
    private navigationService: NavigationService,
    private runsService: RunsService,
    private flowsService: FlowService,
    private authenticationService: AuthenticationService
  ) {
    this.flowFilterControl.setValue(
      this.activatedRoute.snapshot.queryParamMap.get(FLOW_QUERY_PARAM) ||
        this.allOptionValue
    );
    this.statusFilterControl.setValue(
      (this.activatedRoute.snapshot.queryParamMap.get(
        STATUS_QUERY_PARAM
      ) as FlowRunStatus) || this.allOptionValue
    );
    const startDate = this.activatedRoute.snapshot.queryParamMap.get(
      DATE_RANGE_START_QUERY_PARAM
    );
    const endDate = this.activatedRoute.snapshot.queryParamMap.get(
      DATE_RANGE_END_QUERY_PARAM
    );
    this.dateFormGroup.setValue({
      start: startDate ? new Date(startDate) : null,
      end: endDate ? new Date(endDate) : null,
    });
  }

  ngOnInit(): void {
    this.currentProject = this.authenticationService.getProjectId();
    this.flows$ = this.flowsService
      .list({
        projectId: this.currentProject,
        cursor: undefined,
        limit: 1000,
      })
      .pipe(
        map((res) => {
          return res.data.map((flow) => {
            return {
              label: flow.version.displayName,
              value: flow.id,
            };
          });
        }),
        shareReplay(1)
      );

    this.selectedFlowName$ = this.flowFilterControl.valueChanges.pipe(
      startWith(this.flowFilterControl.value),
      switchMap((flowId) => {
        return this.flows$.pipe(
          map((flows) => {
            return (
              flows.find((flow) => flow.value === flowId)?.label ||
              $localize`All`
            );
          })
        );
      })
    );
    this.filtersChanged$ = combineLatest({
      flowId: this.flowFilterControl.valueChanges.pipe(
        startWith(this.flowFilterControl.value)
      ),
      status: this.statusFilterControl.valueChanges.pipe(
        startWith(this.statusFilterControl.value)
      ),
      date: this.dateFormGroup.valueChanges.pipe(
        startWith(this.dateFormGroup.value)
      ),
    }).pipe(
      distinctUntilChanged(),
      tap((result) => {
        const createdAfter = new Date(result.date.start);
        const createdBefore = new Date(result.date.end);
        createdBefore.setHours(23, 59, 59, 999);
        this.navigationService.navigate({
          route: ['runs'],
          openInNewWindow: false,
          extras: {
            queryParams: {
              flowId:
                result.flowId === this.allOptionValue
                  ? undefined
                  : result.flowId,
              status:
                result.status === this.allOptionValue
                  ? undefined
                  : result.status,
              createdAfter: result.date.start
                ? createdAfter.toISOString()
                : undefined,
              createdBefore: result.date.end
                ? createdBefore.toISOString()
                : undefined,
            },
            queryParamsHandling: 'merge',
          },
        });
      }),
      map(() => undefined)
    );

    this.nonCommunityEdition$ = this.flagsService
      .getEdition()
      .pipe(map((res) => res !== ApEdition.COMMUNITY));
    this.updateNotificationsValue$ = this.projectService.currentProject$.pipe(
      take(1),
      tap((project) => {
        this.toggleNotificationFormControl.setValue(
          project?.notifyStatus === NotificationStatus.ALWAYS
        );
      }),
      switchMap(() => {
        return this.toggleNotificationFormControl.valueChanges.pipe(
          distinctUntilChanged(),
          switchMap((value) => {
            return this.projectService.update(this.currentProject, {
              notifyStatus: value
                ? NotificationStatus.ALWAYS
                : NotificationStatus.NEVER,
            });
          })
        );
      })
    );

    this.dataSource = new RunsTableDataSource(
      this.activatedRoute.queryParams,
      this.paginator,
      this.projectService,
      this.instanceRunService,
      this.refreshTableForReruns$.asObservable().pipe(startWith(true))
    );
  }

  openInstanceRun(run: FlowRun, event: MouseEvent) {
    const route = ['/runs/' + run.id];
    const openInNewWindow =
      event.ctrlKey || event.which == 2 || event.button == 4;
    this.navigationService.navigate({
      route: route,
      openInNewWindow,
    });
  }

  retryFlow(run: FlowRun, strategy: FlowRetryStrategy) {
    this.retryFlow$ = this.runsService.retry(run.id, strategy).pipe(
      tap(() => {
        this.refreshTableForReruns$.next(true);
      })
    );
  }
}
