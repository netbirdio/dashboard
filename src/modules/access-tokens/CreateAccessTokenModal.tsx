"use client";

import Button from "@components/Button";
import Code from "@components/Code";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTrigger,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import Separator from "@components/Separator";
import { IconApi } from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { trim } from "lodash";
import {
  AlarmClock,
  CopyIcon,
  ExternalLinkIcon,
  PlusCircle,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";
import { useI18n } from "@/i18n/I18nProvider";
import { AccessToken } from "@/interfaces/AccessToken";
import { User } from "@/interfaces/User";

type Props = {
  children: React.ReactNode;
  user: User;
};
export default function CreateAccessTokenModal({
  children,
  user,
}: Readonly<Props>) {
  const { t } = useI18n();
  const [modal, setModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [token, setToken] = useState<string>("");
  const [, copy] = useCopyToClipboard(token);

  return (
    <>
      <Modal open={modal} onOpenChange={setModal} key={modal ? 1 : 0}>
        <ModalTrigger asChild>{children}</ModalTrigger>
        <AccessTokenModalContent
          onSuccess={(token) => {
            setToken(token);
            setSuccessModal(true);
          }}
          user={user}
        />
      </Modal>
      <Modal
        open={successModal}
        onOpenChange={(open) => {
          setSuccessModal(open);
          setModal(open);
        }}
      >
        <ModalContent
          maxWidthClass={"max-w-lg"}
          className={"mt-20"}
          showClose={false}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className={"pb-6 px-8"}>
            <div className={"flex flex-col items-center justify-center gap-3"}>
              <div>
                <h2 className={"text-2xl text-center mb-2"}>
                  {t("accessTokens.createdTitle")}
                </h2>
                <Paragraph className={"mt-0 text-sm text-center"}>
                  {t("accessTokens.createdHelp")}
                </Paragraph>
              </div>
            </div>
          </div>

          <div className={"px-8 pb-6"}>
            <Code message={t("accessTokens.copied")}>
              <Code.Line>
                {token || t("accessTokens.createFailedFallback")}
              </Code.Line>
            </Code>
          </div>
          <ModalFooter className={"items-center"}>
            <div className={"flex gap-3 w-full"}>
              <ModalClose asChild={true}>
                <Button
                  variant={"secondary"}
                  className={"w-full"}
                  tabIndex={-1}
                  data-cy={"access-token-copy-close"}
                >
                  {t("accessTokens.close")}
                </Button>
              </ModalClose>

              <Button
                variant={"primary"}
                className={"w-full"}
                onClick={() => copy(t("accessTokens.copied"))}
              >
                <CopyIcon size={14} />
                {t("accessTokens.copyToClipboard")}
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

type ModalProps = {
  onSuccess?: (token: string) => void;
  user: User;
};

export function AccessTokenModalContent({
  onSuccess,
  user,
}: Readonly<ModalProps>) {
  const tokenRequest = useApiCall<AccessToken>(`/users/${user.id}/tokens`);
  const { mutate } = useSWRConfig();
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [expiresIn, setExpiresIn] = useState("30");

  const isDisabled = useMemo(() => {
    const trimmedName = trim(name);
    return trimmedName.length === 0;
  }, [name]);

  const submit = () => {
    const expiration = parseInt(expiresIn);
    notify({
      title: t("accessTokens.creatingTitle"),
      description: t("accessTokens.createdDescription", { name }),
      promise: tokenRequest
        .post({
          name,
          expires_in: expiration != 0 ? expiration : 30,
        })
        .then((res) => {
          onSuccess && onSuccess(res.plain_token as string);
          mutate(`/users/${user.id}/tokens`);
        }),
      loadingMessage: t("accessTokens.creating"),
    });
  };

  return (
    <ModalContent maxWidthClass={"max-w-lg"}>
      <ModalHeader
        icon={<IconApi />}
        title={t("accessTokens.modalTitle")}
        description={t("accessTokens.modalDescription")}
        color={"netbird"}
      />

      <Separator />

      <div className={"px-8 py-6 flex flex-col gap-8"}>
        <div>
          <Label>{t("table.name")}</Label>
          <HelpText>{t("accessTokens.nameHelp")}</HelpText>
          <Input
            data-cy={"access-token-name"}
            placeholder={t("accessTokens.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className={"flex justify-between"}>
          <div>
            <Label>{t("accessTokens.expiresIn")}</Label>
            <HelpText>{t("accessTokens.expiresInHelp")}</HelpText>
          </div>
          <Input
            maxWidthClass={"max-w-[200px]"}
            placeholder={"30"}
            data-cy={"access-token-expires-in"}
            min={1}
            max={365}
            value={expiresIn}
            type={"number"}
            onChange={(e) => setExpiresIn(e.target.value)}
            customPrefix={
              <AlarmClock size={16} className={"text-nb-gray-300"} />
            }
            customSuffix={t("accessTokens.days")}
          />
        </div>
      </div>

      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            {t("common.learnMorePrefix")}
            <InlineLink
              href={"https://docs.netbird.io/how-to/access-netbird-public-api"}
              target={"_blank"}
            >
              {t("accessTokens.title")}
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>{t("actions.cancel")}</Button>
          </ModalClose>

          <Button
            variant={"primary"}
            onClick={submit}
            disabled={isDisabled}
            data-cy={"create-access-token"}
          >
            <PlusCircle size={16} />
            {t("accessTokens.createToken")}
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
