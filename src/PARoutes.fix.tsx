// Fixed PA Routes - Implementing stable routing patterns
// This addresses the issues found in the PA module analysis
import { FC, useCallback, useMemo } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Breadcrumb, useModulePathResolver } from "capitalrx-shell";

import { QUEUE_PAGES, STALE_TIME } from "@/constants";
import { ActivityContextProvider } from "@/context";
import { formatCapStrWords, validateUUID } from "@/helpers";
import { useQuestionnaireListQuery } from "@/hooks";
import { useLetterTemplateList } from "@/v2/api";
import { useCasePageQuery, useFeatureFlags } from "@/v2/hooks";

// Import debugging utilities
import { useRouteUnmountDebugger, useStableRoutes } from "../../modules/devtools/src/helpers/map-esm-deps.js";
import { RouteProps, routes as routeConfig } from "./routes";

import styles from "./ReactQueryDevtools.module.scss";
import "./pa_routes.styles.css";

// FIXED: Move QueryClient to module level to prevent recreation
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: STALE_TIME,
    },
  },
});

const casePagePaths = ["case", "case_view"];

// Separate component for route logic to enable proper context placement
const PARoutesInner: FC = () => {
  const useModulePath = useModulePathResolver();
  const modulePath = useModulePath("");
  const { pathname } = useLocation();

  // Add debugging for route changes
  useRouteUnmountDebugger("PARoutesInner");

  const {
    flagValues: [enableQuestionnairesRedesignPage],
  } = useFeatureFlags({ featureFlags: ["enable_questionnaires_redesign_page"] });

  const questionnairePage = enableQuestionnairesRedesignPage ? "questionnaire_view" : "questionnaire";

  // FIXED: Stabilize path calculations to prevent unnecessary re-renders
  const pathInfo = useMemo(() => {
    const currPathList = pathname.split("/");
    const path3 = currPathList[3];
    const path4 = currPathList[4];

    let pathCaseId;
    if (casePagePaths.includes(path3) && !!path4) {
      try {
        pathCaseId = Number(path4);
      } catch (e) {
        console.warn("Failed to parse expected case ID:", path4);
      }
    }

    return { currPathList, path3, path4, pathCaseId };
  }, [pathname]);

  const { currPathList, path3, path4, pathCaseId } = pathInfo;

  const { data: caseData } = useCasePageQuery(pathCaseId);

  const { data: questionnaires } = useQuestionnaireListQuery(
    {
      version_group_uuids: [path4],
    },
    {
      enabled: path3 == questionnairePage && !!validateUUID(path4),
    },
  );

  const questionnaireTitle = questionnaires?.results[0]?.questionnaire.title;

  const { data: letterTemplates } = useLetterTemplateList(
    {
      version_group_uuid: path4,
      latest_versions: true,
      effective_date: "0001-01-01",
      termination_date: "9999-12-31",
    },
    {
      enabled: path3?.startsWith("letter_templates") && !!validateUUID(path4),
    },
  );

  const letterTemplateTitle = letterTemplates?.results[0]?.letter_template.filename;

  // FIXED: Memoize computed values to prevent unnecessary recalculations
  const breadcrumbData = useMemo(() => {
    const queueNameWithoutCase = (() => {
      let localFromList = [...currPathList];
      localFromList = localFromList.slice(3);
      return localFromList.length > 0 ? formatCapStrWords(localFromList.slice(-1)[0]) : null;
    })();

    const pathFourName = path4 && formatCapStrWords(path4);
    const queueOrComplete = !caseData || caseData.is_complete ? "Cases" : caseData.queue_display_name;

    const queueOrCompletePath = (() => {
      if (!caseData || caseData.is_complete) {
        return "/search/case";
      }
      const [pageLabel] = Object.entries(QUEUE_PAGES).find(([, page]) => page.tabs.find((tab) => tab.id === caseData.queue)) || [];
      return pageLabel ? `/queue/${pageLabel}?queue=${caseData.queue}` : "/search/case";
    })();

    return {
      queueNameWithoutCase,
      pathFourName,
      queueOrComplete,
      queueOrCompletePath,
      questionnaireTitle,
      letterTemplateTitle,
    };
  }, [currPathList, path4, caseData, questionnaireTitle, letterTemplateTitle]);

  // FIXED: Stabilize routes to prevent array recreation
  const stableRoutes = useStableRoutes(
    useMemo(
      () =>
        routeConfig.filter(({ path }) => {
          // Filter logic for questionnaire redesign
          if (path.includes("questionnaire_view") && !enableQuestionnairesRedesignPage) {
            return false;
          }
          return true;
        }),
      [enableQuestionnairesRedesignPage],
    ),
  );

  return (
    // FIXED: ActivityContext is now properly placed below the route level
    <ActivityContextProvider>
      <Breadcrumb title="Prior Authorization" path="/">
        {/* All breadcrumb configuration stays the same */}
        <Breadcrumb title={breadcrumbData.queueNameWithoutCase} path={`/queue/${currPathList[4]}`} />
        <Breadcrumb title={breadcrumbData.queueOrComplete} path={breadcrumbData.queueOrCompletePath}>
          <Breadcrumb title={`Case ${currPathList[4]}`} path={`/case_view/${currPathList[4]}`}>
            <Breadcrumb title={`Case ${currPathList[4]}`} path={`/case_view/${currPathList[4]}/appealAcknowledgment`} />
            <Breadcrumb title={"Close Case"} path={`/case/${currPathList[4]}/close`} />
            <Breadcrumb title={`Case ${currPathList[4]}`} path={`/case_view/${currPathList[4]}/createNotification`} />
          </Breadcrumb>
        </Breadcrumb>
        <Breadcrumb title={breadcrumbData.queueOrComplete} path={breadcrumbData.queueOrCompletePath}>
          <Breadcrumb title={`Case ${currPathList[4]}`} path={`/case/${currPathList[4]}`} />
        </Breadcrumb>
        <Breadcrumb title={"Questionnaires"} path={"/questionnaire"}>
          <Breadcrumb title={"Add Questionnaire"} path={`/${questionnairePage}/upload`} />
          <Breadcrumb title={"Batch Test"} path={`/${questionnairePage}/batch_test`} />
          <Breadcrumb title={`${breadcrumbData.questionnaireTitle || currPathList[5]}`} path={`/${questionnairePage}/${currPathList[4]}`}>
            <Breadcrumb title={`Questionnaire ${currPathList[5]}`} path={`/${questionnairePage}/${currPathList[4]}/${currPathList[5]}`} />
            <Breadcrumb
              title={`Edit Questionnaire ${currPathList[5]}`}
              path={`/${questionnairePage}/${currPathList[4]}/${currPathList[5]}/edit`}
            />
            <Breadcrumb title={`New Version`} path={`/${questionnairePage}/${currPathList[4]}/${currPathList[5]}/new`} />
          </Breadcrumb>
        </Breadcrumb>
        {/* ... rest of breadcrumb configuration ... */}
        <Breadcrumb title="Fax Search" path={"/search/fax"}>
          <Breadcrumb title={"View Fax"} path={`/search/fax/${currPathList[4]}`} />
        </Breadcrumb>
        <Breadcrumb title="Fax Intake" path={"/queue/triage?queue=fax_intake"}>
          <Breadcrumb title="Triage Fax" path={`/fax_triage/${currPathList[4]}/${currPathList[5]}`} />
        </Breadcrumb>
        <Breadcrumb title="Failed Communications" path={"/failedCommunications"}>
          <Breadcrumb title={"Re-Send"} path={`/failedCommunications/${currPathList[4]}`} />
        </Breadcrumb>
        <Breadcrumb title={`${breadcrumbData.pathFourName} Cases`} path={`/cases/${currPathList[4]}`} />
        <Breadcrumb title="TAT Batch Test" path={"/turn_around_time/batch_test"} />
        <Breadcrumb title="My Cases & Faxes" path={"/myCasesAndFaxes"} />
        <Breadcrumb title="Letter Templates" path={"/letter_templates"}>
          <Breadcrumb title="Batch Test" path={"/letter_templates/batch_test"} />
          <Breadcrumb title="Create" path={"/letter_templates/create"} />
          <Breadcrumb title={breadcrumbData.letterTemplateTitle || "Letter Template"} path={`/letter_templates/${currPathList[4]}`}>
            <Breadcrumb title="Create Version" path={`/letter_templates/${currPathList[4]}/create`} />
            <Breadcrumb title="Edit Version" path={`/letter_templates/${currPathList[4]}/${currPathList[5]}`} />
          </Breadcrumb>
        </Breadcrumb>
        <Breadcrumb title="Letter Templates" path={"/letter_templates_v2"}>
          <Breadcrumb title="Batch Test" path={"/letter_templates_v2/batch_test"} />
          <Breadcrumb title="Create" path={"/letter_templates_v2/create"} />
          <Breadcrumb title={breadcrumbData.letterTemplateTitle || "Letter Template"} path={`/letter_templates_v2/${currPathList[4]}`}>
            <Breadcrumb title="Create Version" path={`/letter_templates_v2/${currPathList[4]}/create`} />
            <Breadcrumb title="Edit Version" path={`/letter_templates_v2/${currPathList[4]}/${currPathList[5]}`} />
          </Breadcrumb>
        </Breadcrumb>
        <Breadcrumb title="Reports" path={"/reports"}>
          <Breadcrumb title="Report Run" path={`reports/report_run/${currPathList[5]}`} />
        </Breadcrumb>
        <Breadcrumb title="Messages" path={"/messages"}>
          <Breadcrumb title="Create Message" path={`/messages/create`} />
          <Breadcrumb title="Edit Message" path={`/messages/edit`} />
        </Breadcrumb>
        <Breadcrumb title="Question Examples" path={"/QuestionComponentExamples"} />
        <Breadcrumb title="User Permissions" path="/users">
          <Breadcrumb title="Edit User Permissions" path={`/users/edit/${currPathList[5]}`} />
        </Breadcrumb>
        <Breadcrumb title="Dashboard" path={"/dashboard"} />
        <Breadcrumb title="Developer Tools" path="/dev">
          <Breadcrumb title="Edit Feature Flags" path="/dev/edit" />
        </Breadcrumb>
      </Breadcrumb>

      <Routes>
        <Route path={"/"} element={<Navigate to={`${modulePath}/search`} />} />
        {stableRoutes.map(({ path, Component }: RouteProps) => (
          <Route key={path} path={path} element={<Component />} />
        ))}
      </Routes>

      {/* Dev tools are hidden by high z-index of sidebar. Push dev tools above sidebar */}
      <div className={styles.ReactQueryDevtools}>
        <ReactQueryDevtools initialIsOpen={false} />
      </div>
    </ActivityContextProvider>
  );
};

// FIXED: Main export with QueryClientProvider at the proper level
export const PARoutes: FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <PARoutesInner />
    </QueryClientProvider>
  );
};
